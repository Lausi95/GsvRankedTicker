const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

// eslint-disable-next-line no-shadow
const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}] ${label}: ${message}`;
});

function myCreateLogger(loggerName) {
  return createLogger({
    format: combine(label({ label: loggerName }), timestamp(), myFormat),
    transports: [ new transports.Console()],
  });
}

module.exports.createLogger = myCreateLogger;
