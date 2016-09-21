'use strict';

const LoggerConfigFactory = require('hapiest-logger/lib/loggerConfigFactory');
const LoggerFactory = require('hapiest-logger/lib/loggerFactory');

const loggerConfig = LoggerConfigFactory.createFromJsObj({
    enabled: true,
    consoleTransport: {
        enabled: true,
        level: 'info',
        colorize: false
    }
});
const logger = LoggerFactory.createLogger(loggerConfig);

module.exports = logger;
