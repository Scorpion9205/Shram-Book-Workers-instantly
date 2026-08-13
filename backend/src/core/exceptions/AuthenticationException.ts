import { AppException } from './AppException.js';

export class AuthenticationException extends AppException {
  readonly statusCode = 401;
  readonly errorCode: string;

  constructor(message: string, errorCode = 'UNAUTHORIZED') {
    super(message);
    this.errorCode = errorCode;
  }
}
