---
name: shram-error-handling
description: >-
  Use this skill when implementing error handling in SHRAM: defining typed
  exceptions, setting up GlobalErrorHandler middleware, wrapping Prisma errors,
  and ensuring stack traces never reach the client. Activate when: user asks
  about error handling, creating a new exception type, or adding error
  middleware to app.ts.
---

# SHRAM — Error Handling System

## Exception Hierarchy

```typescript
// core/exceptions/AppException.ts
export abstract class AppException extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly details?: unknown;
  readonly isOperational: boolean = true; // vs programming errors

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

```typescript
// core/exceptions/ValidationException.ts
export class ValidationException extends AppException {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(message: string, public readonly errors?: FieldError[]) {
    super(message, errors);
  }
}

// core/exceptions/AuthenticationException.ts
export class AuthenticationException extends AppException {
  readonly statusCode = 401;
  readonly errorCode: string;
  constructor(message: string, errorCode = 'UNAUTHORIZED') {
    super(message);
    this.errorCode = errorCode;
  }
}

// core/exceptions/AuthorizationException.ts
export class AuthorizationException extends AppException {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
}

// core/exceptions/NotFoundException.ts
export class NotFoundException extends AppException {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with ID '${id}' not found` : `${resource} not found`);
  }
}

// core/exceptions/ConflictException.ts
export class ConflictException extends AppException {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}

// core/exceptions/BusinessException.ts
export class BusinessException extends AppException {
  readonly statusCode = 422;
  readonly errorCode: string;
  constructor(errorCode: string, message: string, details?: unknown) {
    super(message, details);
    this.errorCode = errorCode;
  }
}

// core/exceptions/PaymentException.ts
export class PaymentException extends AppException {
  readonly statusCode = 402;
  readonly errorCode: string;
  constructor(errorCode: string, message: string) {
    super(message);
    this.errorCode = errorCode;
  }
}

// core/exceptions/TooManyRequestsException.ts
export class TooManyRequestsException extends AppException {
  readonly statusCode = 429;
  readonly errorCode = 'RATE_LIMIT_EXCEEDED';
}

// core/exceptions/DatabaseException.ts
export class DatabaseException extends AppException {
  readonly statusCode = 500;
  readonly errorCode = 'DATABASE_ERROR';
  readonly isOperational = false;
}
```

## GlobalErrorHandler Middleware

```typescript
// middleware/error.middleware.ts
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
  if ((err as any).name === 'ZodError') {
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
```

## Prisma Error Wrapping

Wrap Prisma errors in repositories, never let them reach the service layer:

```typescript
// In any repository method
async create(data: CreateUserData): Promise<User> {
  try {
    return await this.prisma.client.user.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        const field = (e.meta?.target as string[])?.[0] ?? 'field';
        throw new ConflictException(`User with this ${field} already exists`);
      }
      if (e.code === 'P2025') {
        throw new NotFoundException('User');
      }
    }
    throw new DatabaseException('Database operation failed', e);
  }
}
```

## Mount Order in app.ts

```typescript
// app.ts — error handler MUST be last middleware
app.use('/api/v1/...', someRouter);
// ... all routes ...
app.use(notFoundHandler);        // 404 for unknown routes
app.use(globalErrorHandler);     // must be after all routes
```
