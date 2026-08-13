import { AppException } from './AppException.js';

/**
 * Wraps Prisma/database errors.
 * isOperational = false → logged aggressively, not a user error.
 */
export class DatabaseException extends AppException {
  readonly statusCode = 500;
  readonly errorCode = 'DATABASE_ERROR';
  readonly isOperational = false;

  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}
