const pino = require('pino');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure Pino logger based on environment
const pinoConfig = {
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: NODE_ENV,
    service: 'auth-service',
    version: require('../package.json').version
  }
};

// Pretty print in development, JSON in production
const pinoTransport = NODE_ENV === 'development'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false
      }
    }
  : undefined;

const logger = pinoTransport
  ? pino(pinoConfig, pino.transport(pinoTransport))
  : pino(pinoConfig);

// HTTP request logger for Express
const httpLogger = require('pino-http')({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
    if (res.statusCode >= 500 || err) return 'error';
    return 'info';
  },
  autoLogging: {
    ignorePaths: ['/metrics', '/health'] // Don't log health checks
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
  reqCustomProps: (req) => {
    return {
      userId: req.user?.userId,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
  }
});

// Utility logging functions
const createLogger = (context = 'app') => {
  return logger.child({ context });
};

// Log different event types
const logEvent = {
  // Authentication events
  userRegistered: (email, role) => {
    logger.info({ email, role }, 'User registered');
  },
  userLoggedIn: (userId, role, ip) => {
    logger.info({ userId, role, ip }, 'User logged in');
  },
  userLoggedOut: (userId) => {
    logger.info({ userId }, 'User logged out');
  },
  loginFailed: (email, reason, ip) => {
    logger.warn({ email, reason, ip }, 'Login failed');
  },

  // Token events
  tokenGenerated: (userId, tokenType) => {
    logger.debug({ userId, tokenType }, 'Token generated');
  },
  tokenRefreshed: (userId) => {
    logger.debug({ userId }, 'Token refreshed');
  },
  tokenValidationFailed: (reason) => {
    logger.warn({ reason }, 'Token validation failed');
  },

  // Database events
  dbQuery: (query, duration) => {
    logger.debug({ query, duration }, 'Database query executed');
  },
  dbError: (error, query) => {
    logger.error({ error, query }, 'Database error');
  },

  // Validation events
  validationError: (field, reason) => {
    logger.warn({ field, reason }, 'Validation error');
  },

  // Security events
  rateLimitExceeded: (ip) => {
    logger.warn({ ip }, 'Rate limit exceeded');
  },
  invalidRequestFormat: (error) => {
    logger.warn({ error }, 'Invalid request format');
  },

  // System events
  serviceStarted: (port) => {
    logger.info({ port }, 'Service started');
  },
  serviceError: (error) => {
    logger.error({ error }, 'Service error');
  },
  databaseConnected: () => {
    logger.info('Database connected');
  },
  databaseConnectionFailed: (error) => {
    logger.error({ error }, 'Database connection failed');
  }
};

module.exports = {
  logger,
  httpLogger,
  createLogger,
  logEvent
};
