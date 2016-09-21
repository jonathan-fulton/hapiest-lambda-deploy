'use strict';

const Path = require('path');
const DeployLambdaService = require('./deployLambdaService');

class DeployLambdaServiceFactory {

    /**
     * @name DeployLambdaServiceFactoryFolders
     * @type {Object}
     * @property {string} projectRoot
     * @property {string} config
     */

    /**
     * @param {DeployLambdaServiceFactoryFolders} folders
     * @param {Logger} logger
     * @returns {DeployLambdaService}
     */
    static create(folders, logger) {
        // @TODO: validate credentials & config

        /** @type {DeployLambdaCredentials} */
        const credentials = require(Path.join(folders.config, 'deployCredentials.json'));
        /** @type {DeployLambdaConfig} */
        const config = require(Path.join(folders.config, 'deployConfig.json'));

        return new DeployLambdaService(credentials, config, folders.projectRoot, logger);
    }


}

module.exports = DeployLambdaServiceFactory;