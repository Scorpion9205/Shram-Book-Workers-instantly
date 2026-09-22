import { AppException } from './AppException.js';

/**
 * Client error (400 Bad Request).
 * Used when the client sends malformed or invalid request parameters.
 */
export class BadRequestException extends AppException {
  readonly statusCode = 400;
  readonly errorCode = 'BAD_REQUEST';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
