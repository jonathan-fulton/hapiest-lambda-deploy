'use strict';

const parseArgv = require('minimist');
const DeployLambdaExecutionServiceFactory = require('./deployLambdaExecutionServiceFactory');

class DeployLambdaService {

    /**
     * @name DeployLambdaCredentials
     * @type {Object}
     * @property {Object} awsCredentials
     * @property {string} awsCredentials.accessKeyId
     * @property {string} awsCredentials.secretAccessKey
     * @property {string} awsCredentials.region
     */

    /**
     * @name DeployLambdaConfig
     * @type {Object}
     * @property {DeployLambdaSingleConfig[]} lambdaFunctions
     */

    /**
     * @name DeployLambdaSingleConfig
     * @type {Object}
     * @property {string} functionName
     * @property {string[]} zipContents - array of files/folders relative to the projectRoot that should be included in .zip deploy package
     * @property {DeployLambdaEnvironment[]} environments
     */

    /**
     * @name DeployLambdaEnvironment
     * @type {Object}
     * @property {string} envName
     * @property {string} [nodeEnvValue] - optional, defaults to envName
     * @property {string} liveAliasName - name of the AWS Lambda Function alias that should be updated after successfully publishing a new version
     */

    /**
     * @name DeployLambdaRequest
     * @type {Object}
     * @property {string} functionName
     * @property {string} envName
     * @property {string} commitHash
     */

    /**
     * @param {DeployLambdaCredentials} credentials
     * @param {DeployLambdaConfig} config
     * @param {string} projectRoot
     * @param {Logger} logger
     */
    constructor(credentials, config, projectRoot, logger) {
        this._credentials = credentials;
        this._config = config;
        this._projectRoot = projectRoot;
        this._logger = logger;
    }

    /**
     * @param {DeployLambdaRequest} deployRequest
     * @returns {Promise.<DeployLambdaExecutionServiceResult>}
     */
    deploy(deployRequest) {
        return Promise.resolve()
        .then(() => {
            this._logger.info('Deploy Lambda function', deployRequest);
            const deployExecService = this._getDeployExecutionService(deployRequest);
            return deployExecService.deploy()
            .tap(deployResult => this._logger.info('Deploy Lambda function completed successfully', deployResult));
        })
    }

    /**
     * @param {Array} argv
     *      -f, --function: the function name in the config file you'd like to deploy
     *      -e, --environment: the environment for the function that you'd like to deploy
     *      -c, --commit-hash: commit hash to deploy
     *
     * @returns {Promise.<DeployLambdaExecutionServiceResult>}
     */
    deployFromCommandLineArguments(argv) {
        return Promise.resolve()
            .then(() => this._parseCommandLineArguments(argv))
            .then(deployRequest => this.deploy(deployRequest));
    }

    /**
     * @param {DeployLambdaRequest} deployRequest
     * @returns {DeployLambdaExecutionService}
     * @private
     */
    _getDeployExecutionService(deployRequest) {
        const lambdaFunctionInfo = this._findFunctionInfo(deployRequest.functionName);
        const environment = this._findEnvironment(lambdaFunctionInfo, deployRequest.envName);
        const deployExecInfo = this._createDeployExecutionServiceInfo(lambdaFunctionInfo, environment, deployRequest.commitHash);
        const deployExecService = this._createDeployExecutionService(deployExecInfo);
        return deployExecService;
    }

    /**
     * @param {string} functionName
     * @returns {DeployLambdaSingleConfig}
     * @private
     */
    _findFunctionInfo(functionName) {
        const functionInfoArr = this._config.lambdaFunctions.filter(funcInfo => funcInfo.functionName === functionName);
        if (functionInfoArr.length > 1) {
            throw new Error(`Invalid configuration: multiple lambda functions with name ${appName}`);
        }
        if (functionInfoArr.length === 0) {
            throw new Error(`Invalid configuration: no lambda functions with name ${appName}`);
        }

        return functionInfoArr[0];
    }

    /**
     * @param {DeployLambdaSingleConfig} lambdaFunctionInfo
     * @param {string} environment
     * @returns {DeployLambdaEnvironment}
     * @private
     */
    _findEnvironment(lambdaFunctionInfo, environment) {
        const envArr = lambdaFunctionInfo.environments.filter(env => env.envName === environment);
        if (envArr.length > 1) {
            throw new Error(`Invalid configuration: lambda function ${lambdaFunctionInfo.name} has multiple environments named ${environment}`);
        }
        if (envArr.length === 0) {
            throw new Error(`Invalid configuration: lambda function ${lambdaFunctionInfo.name} has no environment named ${envName}`);
        }

        return envArr[0];
    }

    /**
     *
     * @param {DeployLambdaSingleConfig} lambdaFunctionInfo
     * @param {DeployLambdaEnvironment} environment
     * @param {string} commitHash
     * @returns {DeployLambdaExecutionServiceInfo}
     * @private
     */
    _createDeployExecutionServiceInfo(lambdaFunctionInfo, environment, commitHash) {
        return {
            lambdaFunctionName: lambdaFunctionInfo.functionName,
            envName: environment.envName,
            nodeEnvValue: environment.nodeEnvValue || environment.envName,
            liveAliasName: environment.liveAliasName,
            commitHash: commitHash,
            projectRoot: this._projectRoot,
            zipContents: lambdaFunctionInfo.zipContents
        };
    }

    /**
     * @param {DeployLambdaExecutionServiceInfo} deployExecInfo
     * @returns {DeployLambdaExecutionService}
     * @private
     */
    _createDeployExecutionService(deployExecInfo) {
        return DeployLambdaExecutionServiceFactory.create(this._credentials, deployExecInfo, this._logger);
    }

    /**
     * @param {Array} argv
     *      -f, --function: the function name in the config file you'd like to deploy
     *      -e, --environment: the environment for the function that you'd like to deploy
     *      -c, --commit-hash: commit hash to deploy
     *
     * @returns {DeployLambdaRequest}
     * @private
     */
    _parseCommandLineArguments(argv) {
        const argvObj = parseArgv(argv);
        const functionName = argvObj.f || argvObj.function;
        const envName = argvObj.e || argvObj.environment;
        const commitHash = argvObj.c || argvObj['commit-hash'];

        if (!functionName) {
            throw new Error('Invalid argv - option -f / --function required');
        }
        if (!envName) {
            throw new Error('Invalid argv - option -e / --environment required');
        }
        if(!commitHash || commitHash.length !== 40) {
            throw new Error('Invalid argv - option -c / --commit-hash must be a full length git hash of 40 characters');
        }
        const returnObj = {
            functionName: functionName,
            envName: envName,
            commitHash: commitHash
        };

        return returnObj;
    }
    
}

module.exports = DeployLambdaService;