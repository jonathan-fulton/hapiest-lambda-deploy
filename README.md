Hapiest-lambda-deploy is designed to make it super-simple to deploy one or more lambda functions in a repository.

## Setup

1. Create a deploy config folder with the following files:

    i. deployConfig.json (see example below)
        
    ```json
    {
      "lambdaFunctions": [{
        "functionName": "hapiestLambdaDeployTest",
        "zipContents": [
          "index.js",
          "lib"
        ],
        "environments": [
          {
            "envName": "env1",
            "nodeEnvValue": "environment1",
            "liveAliasName": "LIVE"
          }, {
            "envName": "env2",
            "nodeEnvValue": "environment2",
            "liveAliasName": "LIVE"
          }
        ]
      }]
    }
    ```

    ii. deployCredentials.json (see example below)
    
    ```json
    {
      "awsCredentials": {
        "accessKeyId": "someIAMAccessKeyId",
        "secretAccessKey": "someIAMSecretAccessKey",
        "region": "us-east-1"
      }
    }
    ```
    
2. Create a "bin" .js file similar to the one below
    
    ```javascript
    const Promise = require('bluebird');
    const Path = require('path');
    const NodeConfig = require('config');
    const serviceLocator = require('../../services/serviceLocatorFactory').getServiceLocatorSingleton(NodeConfig);
    const logger = serviceLocator.getLogger();
    
    /** @type {DeployLambdaServiceFactoryFolders} */
    const folders = {
        config: Path.resolve(__dirname, '../config'),
        projectRoot: Path.resolve(__dirname, '../..')
    };
    const DeployServiceFactory = require('hapiest-lambda-deploy');
    const deployService = DeployServiceFactory.create(folders, logger);
    
    deployService.deployFromCommandLineArguments(process.argv)
    .then(() => process.exit());
    ```


3. Update package.json to make it easy to deploy using "npm run ..."

    ```json
    {
        "scripts": {
            "git:ensureClean": "test -z \"$(git status --porcelain)\" || (echo \"Dirty working directory - aborting\" && test -n \"\")",
            "deploy:env1": "npm run git:ensureClean && node deploy/bin/deploy.js -f hapiestLambdaDeployTest -e env1 -c $(git rev-parse HEAD)"
        }
    }
    ```

    Note, you want to ensure that you have a clean directory so that you don't accidentally deploy code that hasn't been tested / check in.
    You can optionally remove git:ensureClean step if you like playing Russian Roulette.


4. Deploy the Lambda function by running

    ```
    npm run deploy:env1
    ```
    
## Running the tests

Currently there's only a single integration test.  I plan to add unit tests at some later point in time.  To get the integration test up and running, you should:

1. Create test/helper/integration/config/deployCredentials.json file with valid credentials from Setup step 1

2. Create an AWS Lambda function with the name `hapiestLambdaDeployTest_env1` and a corresponding alias named `LIVE`

3. Check that the test runs using `npm run test:integration`