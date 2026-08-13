import { AppException } from './AppException.js';

export class PaymentException extends AppException {
  readonly statusCode = 402;
  readonly errorCode: string;

  constructor(errorCode: string, message: string) {
    super(message);
    this.errorCode = errorCode;
  }
}
