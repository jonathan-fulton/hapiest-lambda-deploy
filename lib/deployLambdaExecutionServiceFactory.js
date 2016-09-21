'use strict';

const AWS = require('aws-sdk');
const DeployLambdaExecutionService = require('./deployLambdaExecutionService');

class DeployLambdaExecutionServiceFactory {

    /**
     * @name DeployLambdaExecutionServiceInfo
     * @type {Object}
     * @property {string} lambdaFunctionName
     * @property {string} envName
     * @property {string} nodeEnvValue
     * @property {string} liveAliasName
     * @property {string} commitHash
     * @property {string} projectRoot
     * @property {string[]} zipContents
     */

    /**
     * @param {DeployLambdaCredentials} credentials
     * @param {DeployLambdaExecutionServiceInfo} info
     * @param {Logger} logger
     * @returns {DeployLambdaExecutionService}
     */
    static create(credentials, info, logger) {
        const awsLambda = new AWS.Lambda({
            accessKeyId: credentials.awsCredentials.accessKeyId,
            secretAccessKey: credentials.awsCredentials.secretAccessKey,
            region: credentials.awsCredentials.region
        });

        return new DeployLambdaExecutionService(awsLambda, info, logger);
    }

}

module.exports = DeployLambdaExecutionServiceFactory;