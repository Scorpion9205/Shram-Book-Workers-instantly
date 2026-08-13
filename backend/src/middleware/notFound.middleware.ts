import { Request, Response, NextFunction } from 'express';
import { NotFoundException } from '../core/exceptions/NotFoundException.js';

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundException('Route'));
};
