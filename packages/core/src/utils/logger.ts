import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.json({ space: process.env.IS_LOCAL ? 2 : 0 }),
    winston.format.timestamp()
  ),
  transports: [new winston.transports.Console()],
});
