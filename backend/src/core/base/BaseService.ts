import { Logger } from '../logger/Logger.js';

/**
 * Abstract base for all SHRAM services.
 *
 * Rules:
 * - Services implement a typed interface (IXxxService)
 * - ZERO imports from 'express' — services are framework-agnostic
 * - ZERO Prisma calls — delegate to repository
 * - All business logic lives here
 */
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  protected log(message: string, meta?: object): void {
    this.logger.info(message, meta);
  }

  protected logError(message: string, error?: unknown, meta?: object): void {
    this.logger.error(message, error, meta);
  }

  protected logWarn(message: string, meta?: object): void {
    this.logger.warn(message, meta);
  }

  protected logDebug(message: string, meta?: object): void {
    this.logger.debug(message, meta);
  }
}
