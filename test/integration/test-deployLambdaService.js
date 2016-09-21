'use strict';

const Should = require('should');
const Promise = require('bluebird');
const Path = require('path');
const Fs = require('fs');
const Moment = require('moment');
const Aws = require('aws-sdk');
const awsConfig = require('../helper/integration/config/deployCredentials.json').awsCredentials;
const awsLambda = new Aws.Lambda(awsConfig);

const DeployLambdaServiceFactory = require('../../lib/deployLambdaServiceFactory');
const logger = require('../helper/logger');

const folders = {
    projectRoot: Path.resolve(__dirname, '../helper/integration/projectRoot'),
    config: Path.resolve(__dirname, '../helper/integration/config')
};
const deployLambdaService = DeployLambdaServiceFactory.create(folders, logger);

let timestampFilePath;

describe('DeployLambdaService', function() {

    describe('deployFromCommandLineArguments', function() {
        
        before(function() {
            timestampFilePath = Path.resolve(__dirname,'../helper/integration/projectRoot/timestamp.txt');
            Fs.writeFileSync(timestampFilePath, Moment().format())
        });
        
        after(function() {
            Fs.unlinkSync(timestampFilePath);
        });

       it('Should successfully publish a new version of the Lambda function and update alias', function() {

           let preDeployInfo;
           return Promise.resolve()
           .then(() => getPreDeployInfo('hapiestLambdaDeployTest_env1', 'LIVE').then(_preDeployInfo => preDeployInfo = _preDeployInfo))
           .then(() => deployLambdaService.deployFromCommandLineArguments(['node','somefile.js','-f','hapiestLambdaDeployTest','-e','env1', '-c','ppXhTRJpPHDOzHraN7A7GXaCoVi6jr1u9OEzqgW3']))
           .then(deployResult => {
               Should.exist(deployResult);
               deployResult.should.have.properties(['FunctionName','FunctionVersion','AliasName']);
               deployResult.FunctionName.should.eql('hapiestLambdaDeployTest_env1');
               deployResult.AliasName.should.eql('LIVE');
               parseInt(deployResult.FunctionVersion).should.be.greaterThanOrEqual(parseInt(preDeployInfo.FunctionVersion) + 1);
           })

       });

    });

});

/**
 * @param functionName
 * @param aliasName
 * @returns {Promise.<{AliasArn: string, Name: string, FunctionVersion: string, Description: string}>}
 */
function getPreDeployInfo(functionName, aliasName) {
    return new Promise((resolve, reject) => {
        awsLambda.getAlias({FunctionName: functionName, Name: aliasName}, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    });
}
