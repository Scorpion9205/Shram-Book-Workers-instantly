import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationException } from '../core/exceptions/ValidationException.js';

export const validateBody = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationException(
        'Validation failed',
        result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }
    req.body = result.data;
    next();
  };

export const validateQuery = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ValidationException(
        'Invalid query parameters',
        result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }
    req.query = result.data as any;
    next();
  };

export const validateParams = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new ValidationException(
        'Invalid path parameters',
        result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }
    next();
  };
