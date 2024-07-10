//logger.js
const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;

const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
        verbose: 5,
        raw: 6,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
        verbose: 'grey',
        raw: 'yellow',
    },
};

winston.addColors(customLevels.colors);

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
    levels: customLevels.levels,
    level: 'debug', // Default log level
    format: combine(
        colorize(),
        timestamp(),
        logFormat
    ),
    transports: [
        new transports.Console()
    ]
});

module.exports = logger;
