'use strict';

const Promise = require('bluebird');
const Fs = require('fs');
const Path = require('path');
const AdmZip = require('adm-zip');
const Moment = require('moment');

class DeployLambdaExecutionService {

    /**
     * @param {AWS.Lambda} awsLambda
     * @param {DeployLambdaExecutionServiceInfo} info
     * @param {Logger} logger
     */
    constructor(awsLambda, info, logger) {
        this._awsLambda = awsLambda;
        this._info = info;
        this._logger = logger;
    }

    /**
     * @returns {Promise.<DeployLambdaExecutionServiceResult>}
     */
    deploy() {
        return Promise.resolve()
        .then(() => this._createZipBuffer())
        .then(zipBuffer => this._deployToAws(zipBuffer));
    }

    /**
     * @returns {Promise.<Buffer>}
     * @private
     */
    _createZipBuffer() {
        return Promise.resolve()
        .then(() => {
            const zip = new AdmZip();

            this._info.zipContents.forEach(fileOrDirectory => {
                let fileStat;
                const localFileOrDirPath = Path.resolve(this._info.projectRoot, fileOrDirectory);
                try {
                    fileStat = Fs.statSync(localFileOrDirPath);
                } catch(err) {
                    this._logger.error('File or directory does not exist', {fileOrDirectory: fileOrDirectory, err:err});
                    throw err;
                }

                if (fileStat.isFile()) {
                    let zipPath = Path.dirname(fileOrDirectory);
                    if (zipPath === '.') {
                        zipPath = '';
                    }
                    const zipName = Path.basename(fileOrDirectory);

                    zip.addLocalFile(localFileOrDirPath, zipPath, zipName);
                } else if (fileStat.isDirectory()) {
                    zip.addLocalFolder(localFileOrDirPath, fileOrDirectory);
                } else {
                    this._logger.info('Skipping file or directory', {fileOrDirectory: fileOrDirectory});
                }
            });

            zip.addFile('.env', new Buffer(`NODE_ENV=${this._info.nodeEnvValue}`, 'utf-8'));
            return zip.toBuffer();
        });
    }

    /**
     * @name DeployLambdaExecutionServiceResult
     * @type {Object}
     * @property {string} FunctionName
     * @property {string} AliasName
     * @property {string} FunctionVersion
     */

    /**
     * @param {Buffer} zipBuffer
     * @returns {Promise<DeployLambdaExecutionServiceResult>}
     * @private
     */
    _deployToAws(zipBuffer) {
        const lambdaFunctionName = this._getFullLambdaFunctionName();
        return new Promise((resolve, reject) => {
            this._awsLambda.updateFunctionCode({
                FunctionName: lambdaFunctionName,
                Publish: true,
                ZipFile: zipBuffer
            }, (err, data) => {
                if (err) {
                    return reject(err);
                } else {
                    this._logger.info('Successfully published new version of lambda function', {lambdaFunction: lambdaFunctionName, FunctionVersion: data.FunctionVersion});
                    return resolve(data);
                }
            })
        })
        .then(data => new Promise((resolve, reject) => {
            this._awsLambda.updateAlias({
                FunctionName: lambdaFunctionName,
                Name: this._info.liveAliasName,
                FunctionVersion: data.Version
            }, (err, data) => {
                if (err) {
                    reject(err)
                } else {
                    this._logger.info('Successfully updated alias', {lambdaFunction: lambdaFunctionName, AliasName: this._info.liveAliasName, FunctionVersion: data.FunctionVersion});
                    resolve(data);
                }
            })
        }))
        .then(data => {
            return {
                FunctionName: lambdaFunctionName,
                AliasName: this._info.liveAliasName,
                FunctionVersion: data.FunctionVersion
            }
        });
    }

    _getFullLambdaFunctionName() {
        return `${this._info.lambdaFunctionName}_${this._info.envName}`;
    }
}

module.exports = DeployLambdaExecutionService;