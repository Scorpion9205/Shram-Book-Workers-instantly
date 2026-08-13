import { AppException } from './AppException.js';

export class NotFoundException extends AppException {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';

  constructor(resource: string, id?: string) {
    super(id ? `${resource} with ID '${id}' not found` : `${resource} not found`);
  }
}
