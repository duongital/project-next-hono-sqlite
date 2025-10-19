import { Context, MiddlewareHandler } from 'hono';

/**
 * Structured log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Structured logger interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Structured logger class
 */
export class Logger {
  private requestId?: string;
  private userId?: string;

  constructor(requestId?: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      userId: this.userId,
      metadata,
    };

    // Use console methods based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(entry));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(entry));
        break;
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(entry));
        break;
      default:
        console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>) {
    const errorData = error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      requestId: this.requestId,
      userId: this.userId,
      error: errorData,
      metadata,
    };

    console.error(JSON.stringify(entry));
  }
}

/**
 * Request logging middleware
 * Logs all incoming requests and their responses with timing information
 */
export const requestLogger = (): MiddlewareHandler => {
  return async (c: Context, next) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Get user ID if available (from auth middleware)
    const userId = c.get('userId') as string | undefined;

    // Create logger instance
    const logger = new Logger(requestId, userId);

    // Store logger in context for use in routes
    c.set('logger', logger);
    c.set('requestId', requestId);

    // Log incoming request
    logger.info('Incoming request', {
      method: c.req.method,
      path: c.req.path,
      userAgent: c.req.header('user-agent'),
      contentType: c.req.header('content-type'),
    });

    try {
      await next();
    } finally {
      const duration = Date.now() - startTime;
      const statusCode = c.res.status;

      // Log response
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO,
        message: 'Request completed',
        requestId,
        userId,
        method: c.req.method,
        path: c.req.path,
        statusCode,
        duration,
      };

      if (statusCode >= 500) {
        console.error(JSON.stringify(logEntry));
      } else if (statusCode >= 400) {
        console.warn(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }
  };
};

/**
 * Error logging middleware
 * Catches unhandled errors and logs them with stack traces
 */
export const errorLogger = (): MiddlewareHandler => {
  return async (c: Context, next) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId') as string | undefined;
      const userId = c.get('userId') as string | undefined;
      const logger = new Logger(requestId, userId);

      logger.error('Unhandled error', error, {
        method: c.req.method,
        path: c.req.path,
      });

      // Re-throw to let Hono handle the error response
      throw error;
    }
  };
};

/**
 * Create a logger instance for use in routes
 */
export function createLogger(c: Context): Logger {
  const requestId = c.get('requestId') as string | undefined;
  const userId = c.get('userId') as string | undefined;
  return new Logger(requestId, userId);
}
