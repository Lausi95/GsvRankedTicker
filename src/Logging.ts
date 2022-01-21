import * as winston from 'winston'

const myFormat = winston.format.printf(({level, message, label, timestamp}) => {
  return `${timestamp} [${level.toUpperCase()}] ${label}: ${message}`;
});

export function createLogger(loggerName: string) {
  return winston.createLogger({
    format: winston.format.combine(winston.format.label({label: loggerName}), winston.format.timestamp(), myFormat),
    transports: [new winston.transports.Console()],
  });
}
