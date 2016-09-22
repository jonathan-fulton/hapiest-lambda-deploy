'use strict';

const Promise = require('bluebird');
const Fs = require('fs');
const Path = require('path');
const Archiver = require('archiver');
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

            this._logger.info('Creating .zip file buffer', {filesAndDirectories: this._info.zipContents});

            return new Promise((resolve, reject) => {
                const zip = new Archiver('zip', {});
                const buffers = [];

                // Aggregate the zip buffer into an array as it pipes in
                zip.on('data', data => buffers.push(data));
                // When the zip stream finishes, create an actual Buffer and resolve the promise
                zip.on('end', () => {
                    this._logger.debug('Done adding files to .zip, writing buffer');
                    const buffer = Buffer.concat(buffers);
                    this._logger.info('Creating .zip file buffer completed');
                    resolve(buffer)
                });
                zip.on('error', err => reject(err));

                // Add each file and directory to the .zip archive
                this._info.zipContents.forEach(fileOrDirectory => {

                    this._logger.debug('Adding file or directory to .zip buffer', {fileOrDirectory: fileOrDirectory});

                    let fileStat;
                    const localFileOrDirPath = Path.resolve(this._info.projectRoot, fileOrDirectory);
                    try {
                        fileStat = Fs.statSync(localFileOrDirPath);
                    } catch(err) {
                        this._logger.error('File or directory does not exist', {fileOrDirectory: fileOrDirectory, err:err});
                        throw err;
                    }

                    if (fileStat.isFile()) {
                        zip.file(localFileOrDirPath, {name: fileOrDirectory})
                    } else if (fileStat.isDirectory()) {
                        zip.directory(localFileOrDirPath, fileOrDirectory);
                    } else {
                        this._logger.info('Skipping file or directory', {fileOrDirectory: fileOrDirectory});
                    }
                });

                this._logger.debug('Adding .env file to .zip buffer');
                zip.append(new Buffer(`NODE_ENV=${this._info.nodeEnvValue}`, 'utf-8'), {name: '.env'});

                // .zip stream is now finalized
                zip.finalize();
            })
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

        this._logger.info('Publishing new code for Lambda function', {lambdaFunction: lambdaFunctionName});

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