import { AppException } from './AppException.js';

export class ConflictException extends AppException {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}
