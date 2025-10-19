import { Logger } from '../middleware/logging';

/**
 * Database query performance logger
 * Wraps database operations to track execution time
 */
export class DbLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Log a database query with execution time
   */
  async logQuery<T>(
    operation: string,
    tableName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      this.logger.info('Database query executed', {
        operation,
        table: tableName,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Database query failed', error, {
        operation,
        table: tableName,
        duration,
      });

      throw error;
    }
  }

  /**
   * Log a database transaction
   */
  async logTransaction<T>(
    transactionName: string,
    transactionFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await transactionFn();
      const duration = Date.now() - startTime;

      this.logger.info('Database transaction completed', {
        transaction: transactionName,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Database transaction failed', error, {
        transaction: transactionName,
        duration,
      });

      throw error;
    }
  }
}

/**
 * Create a database logger instance
 */
export function createDbLogger(logger: Logger): DbLogger {
  return new DbLogger(logger);
}
