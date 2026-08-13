import { AppException } from './AppException.js';

export class TooManyRequestsException extends AppException {
  readonly statusCode = 429;
  readonly errorCode = 'RATE_LIMIT_EXCEEDED';

  constructor(message = 'Too many requests. Please try again later.') {
    super(message);
  }
}
