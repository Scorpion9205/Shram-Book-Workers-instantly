export interface FieldError {
  field: string;
  message: string;
}

/**
 * Abstract base for all SHRAM domain exceptions.
 * Never use `throw new Error("string")` — subclass this instead.
 */
export abstract class AppException extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly details?: unknown;
  /** Operational errors are expected (user input, business rule violations).
   *  Non-operational errors are programming bugs — logged more aggressively. */
  readonly isOperational: boolean = true;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
