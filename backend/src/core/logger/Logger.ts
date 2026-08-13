import { env } from '../../config/env.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Structured JSON logger.
 * Usage: const logger = new Logger('BookingService');
 *        logger.info('Booking created', { bookingId });
 */
export class Logger {
  private readonly context: string;
  private readonly minLevel: number;

  constructor(context: string) {
    this.context = context;
    this.minLevel = LEVEL_ORDER[env.LOG_LEVEL as LogLevel] ?? 2;
  }

  info(message: string, meta?: object): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: object): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: unknown, meta?: object): void {
    const errorMeta = error instanceof Error
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : { error: String(error) };
    this.log('error', message, { ...errorMeta, ...meta });
  }

  debug(message: string, meta?: object): void {
    this.log('debug', message, meta);
  }

  private log(level: LogLevel, message: string, meta?: object): void {
    if (LEVEL_ORDER[level] > this.minLevel) return;

    const entry = JSON.stringify({
      level,
      context: this.context,
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    });

    if (level === 'error') {
      process.stderr.write(entry + '\n');
    } else {
      process.stdout.write(entry + '\n');
    }
  }
}
