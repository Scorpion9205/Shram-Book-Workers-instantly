import { Request, Response, NextFunction } from 'express';
import { AppException } from '../core/exceptions/AppException.js';
import { ResponseBuilder } from '../core/responses/ResponseBuilder.js';
import { Logger } from '../core/logger/Logger.js';

const logger = new Logger('GlobalErrorHandler');

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle typed AppException
  if (err instanceof AppException) {
    if (!err.isOperational) {
      logger.error('Non-operational error', { message: err.message, stack: err.stack });
    }

    res.status(err.statusCode).json(
      ResponseBuilder.error(
        err.message,
        err.errorCode,
        (err as any).errors,
      ),
    );
    return;
  }

  // Handle Zod errors (if they escape middleware)
  if (err.name === 'ZodError') {
    res.status(400).json(ResponseBuilder.error('Validation failed', 'VALIDATION_ERROR'));
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(ResponseBuilder.error('Invalid token', 'INVALID_TOKEN'));
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json(ResponseBuilder.error('Token expired', 'TOKEN_EXPIRED'));
    return;
  }

  // Unknown / programming error — never expose details
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json(ResponseBuilder.error('Internal server error', 'INTERNAL_ERROR'));
}
