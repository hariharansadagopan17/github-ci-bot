const winston = require('winston');
const ElasticsearchTransport = require('winston-elasticsearch');
const path = require('path');
const fs = require('fs-extra');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
fs.ensureDirSync(logsDir);

// Create Elasticsearch transport configuration
const esTransportOpts = {
    level: 'info',
    clientOpts: {
        node: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200',
        maxRetries: 5,
        requestTimeout: 60000,
        sniffOnStart: true
    },
    index: process.env.ELASTICSEARCH_INDEX || 'regression-test-logs',
    indexPrefix: 'regression-tests',
    indexSuffixPattern: 'YYYY.MM.DD',
    messageType: 'json',
    transformer: logData => {
        const transformed = {
            '@timestamp': new Date().toISOString(),
            level: logData.level,
            message: logData.message,
            meta: logData.meta || {},
            environment: process.env.TEST_ENV || 'development',
            buildNumber: process.env.BUILD_NUMBER || '1',
            gitBranch: process.env.GIT_BRANCH || 'main',
            gitCommit: process.env.GIT_COMMIT || '',
            testSuite: 'regression-automation',
            service: 'regression-testing-framework'
        };

        // Add scenario context if available
        if (logData.meta && logData.meta.scenario) {
            transformed.scenario = logData.meta.scenario;
        }

        // Add error details if present
        if (logData.meta && logData.meta.error) {
            transformed.error = {
                message: logData.meta.error.message,
                stack: logData.meta.error.stack,
                name: logData.meta.error.name
            };
        }

        return transformed;
    }
};

// Create logger configuration
const loggerConfig = {
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'regression-testing-framework',
        environment: process.env.TEST_ENV || 'development'
    },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    let metaStr = '';
                    if (Object.keys(meta).length > 0) {
                        metaStr = ` ${JSON.stringify(meta)}`;
                    }
                    return `${timestamp} [${level}]: ${message}${metaStr}`;
                })
            )
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'regression-tests.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        
        // Separate file for errors
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
};

// Add Elasticsearch transport if enabled
if (process.env.ELASTICSEARCH_HOST && process.env.ELASTICSEARCH_HOST !== '') {
    try {
        loggerConfig.transports.push(new ElasticsearchTransport(esTransportOpts));
    } catch (error) {
        console.warn('Failed to initialize Elasticsearch transport:', error.message);
    }
}

// Create logger instance
const logger = winston.createLogger(loggerConfig);

// Add custom methods for test-specific logging
logger.testInfo = (message, meta = {}) => {
    logger.info(message, { ...meta, testLog: true });
};

logger.testError = (message, error = null, meta = {}) => {
    const errorMeta = error ? { error, testLog: true, ...meta } : { testLog: true, ...meta };
    logger.error(message, errorMeta);
};

logger.testDebug = (message, meta = {}) => {
    logger.debug(message, { ...meta, testLog: true });
};

logger.scenarioStart = (scenarioName, tags = []) => {
    logger.info(`Starting scenario: ${scenarioName}`, {
        scenario: scenarioName,
        tags,
        event: 'scenario_start',
        testLog: true
    });
};

logger.scenarioEnd = (scenarioName, status, duration = 0, error = null) => {
    const meta = {
        scenario: scenarioName,
        status,
        duration,
        event: 'scenario_end',
        testLog: true
    };
    
    if (error) {
        meta.error = error;
    }
    
    const message = `Scenario ${status.toLowerCase()}: ${scenarioName} (${duration}ms)`;
    
    if (status === 'PASSED') {
        logger.info(message, meta);
    } else {
        logger.error(message, meta);
    }
};

logger.stepInfo = (stepText, meta = {}) => {
    logger.info(`Step: ${stepText}`, {
        step: stepText,
        event: 'step_execution',
        testLog: true,
        ...meta
    });
};

logger.browserAction = (action, element = '', meta = {}) => {
    logger.info(`Browser action: ${action} ${element}`, {
        action,
        element,
        event: 'browser_action',
        testLog: true,
        ...meta
    });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = logger;
