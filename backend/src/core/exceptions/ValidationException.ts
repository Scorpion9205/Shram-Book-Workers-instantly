import { AppException, type FieldError } from './AppException.js';

export class ValidationException extends AppException {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';
  readonly errors: FieldError[];

  constructor(message: string, errors: FieldError[] = []) {
    super(message, errors);
    this.errors = errors;
  }
}
