import { AppException } from './AppException.js';

/**
 * Business rule violation (422 Unprocessable Entity).
 * Use for domain-level rule failures: invalid state transitions,
 * business constraints, etc.
 *
 * @example throw new BusinessException('INVALID_TRANSITION', 'Cannot move booking from CLOSED to CREATED')
 */
export class BusinessException extends AppException {
  readonly statusCode = 422;
  readonly errorCode: string;

  constructor(errorCode: string, message: string, details?: unknown) {
    super(message, details);
    this.errorCode = errorCode;
  }
}
