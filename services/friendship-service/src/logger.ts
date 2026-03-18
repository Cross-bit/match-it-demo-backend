import winston from 'winston';

const logger = winston.createLogger({
    transports: [
    new winston.transports.Console(
        {
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.metadata({fillExcept: ['timestamp', 'service', 'level', 'message']}),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, metadata }) => {
                    const metadataString = metadata != null ? JSON.stringify(metadata) : '';
                    return `[${timestamp}] ${level}: ${message} ${metadataString}`;
            })
        )
    }
    ),
    new winston.transports.File({
        level: 'warn',
        dirname: "logs",
        filename: "logsWarnings.log",
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    }),
    new winston.transports.File({
        level: 'error',
        dirname: "logs",
        filename: "logsErrors.log",
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    })]
});

export default logger;