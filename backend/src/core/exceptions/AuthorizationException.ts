import { AppException } from './AppException.js';

export class AuthorizationException extends AppException {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';

  constructor(message = 'You do not have permission to perform this action') {
    super(message);
  }
}
