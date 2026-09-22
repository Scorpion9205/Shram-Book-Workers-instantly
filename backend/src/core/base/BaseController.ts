import type { Response } from 'express';
import { ResponseBuilder, type PaginationMeta, type FieldError } from '../responses/ResponseBuilder.js';
import { ValidationException } from '../exceptions/ValidationException.js';
import { S3Provider } from '../../infrastructure/providers/storage/S3Provider.js';
import type { ZodSchema, ZodIssue } from 'zod';

/**
 * Abstract base for all SHRAM controllers.
 *
 * Rules:
 * - All route handlers MUST be arrow-function class fields (binds 'this' correctly for Express)
 * - Controllers parse input + call service + call one of these response helpers
 * - Zero business logic — delegate everything to the service layer
 */
export abstract class BaseController {
  /**
   * 200 OK — single resource or action result
   */
  protected async ok<T>(res: Response, data: T, message: string): Promise<void> {
    const signedData = await S3Provider.signUrlsInObject(data);
    res.status(200).json(ResponseBuilder.success(signedData, message));
  }

  /**
   * 201 Created — resource was created
   */
  protected async created<T>(res: Response, data: T, message: string): Promise<void> {
    const signedData = await S3Provider.signUrlsInObject(data);
    res.status(201).json(ResponseBuilder.success(signedData, message));
  }

  /**
   * 202 Accepted — async operation started
   */
  protected async accepted<T>(res: Response, data: T, message: string): Promise<void> {
    const signedData = await S3Provider.signUrlsInObject(data);
    res.status(202).json(ResponseBuilder.success(signedData, message));
  }

  /**
   * 204 No Content — delete / deactivate actions
   */
  protected noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * 200 Paginated list
   */
  protected async paginated<T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string,
  ): Promise<void> {
    const meta: PaginationMeta = ResponseBuilder.buildPaginationMeta(total, page, limit);
    const signedItems = await S3Provider.signUrlsInObject(items);
    res.status(200).json(ResponseBuilder.success(signedItems, message, meta));
  }

  /**
   * Validates a request body/query/params against a Zod schema.
   * Throws ValidationException (400) on failure so GlobalErrorHandler handles it.
   */
  protected validate<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors: FieldError[] = result.error.issues.map((e: ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ValidationException('Validation failed', errors);
    }
    return result.data;
  }
}
