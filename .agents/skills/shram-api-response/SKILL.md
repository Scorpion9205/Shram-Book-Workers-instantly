---
name: shram-api-response
description: >-
  Use this skill when setting up or modifying the SHRAM standard API response
  system: ResponseBuilder utility, BaseController response helpers, pagination
  meta shape, and GlobalResponseHandler. Activate when: user asks about
  response format, how to send a paginated response, what the success/error
  envelope looks like, or how to standardize API responses.
---

# SHRAM — Standard API Response System

## Response Shapes

### Success Response
```json
{ "success": true, "message": "Booking retrieved.", "data": {} }
```

### Paginated Success
```json
{
  "success": true,
  "message": "Bookings retrieved.",
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed.",
  "errorCode": "VALIDATION_ERROR",
  "errors": [{ "field": "phone", "message": "Invalid phone number" }]
}
```

## ResponseBuilder

```typescript
// core/responses/ResponseBuilder.ts
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  errors?: FieldError[];
}

export class ResponseBuilder {
  static success<T>(data: T, message: string, meta?: PaginationMeta): SuccessResponse<T> {
    return {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };
  }

  static error(message: string, errorCode: string, errors?: FieldError[]): ErrorResponse {
    return {
      success: false,
      message,
      errorCode,
      ...(errors?.length && { errors }),
    };
  }

  static buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

## BaseController Response Methods

```typescript
// core/base/BaseController.ts (response methods)
export abstract class BaseController {
  protected ok<T>(res: Response, data: T, message: string): void {
    res.status(200).json(ResponseBuilder.success(data, message));
  }

  protected created<T>(res: Response, data: T, message: string): void {
    res.status(201).json(ResponseBuilder.success(data, message));
  }

  protected accepted<T>(res: Response, data: T, message: string): void {
    res.status(202).json(ResponseBuilder.success(data, message));
  }

  protected noContent(res: Response): void {
    res.status(204).send();
  }

  protected paginated<T>(
    res: Response,
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string,
  ): void {
    const meta = ResponseBuilder.buildPaginationMeta(total, page, limit);
    res.status(200).json(ResponseBuilder.success(items, message, meta));
  }
}
```

## Example Usage in Controllers

```typescript
// Single resource
getBookingById = async (req: Request, res: Response): Promise<void> => {
  const booking = await this.bookingService.getById(req.params.id, req.user!.id);
  this.ok(res, booking, 'Booking retrieved successfully');
};

// Paginated list
listBookings = async (req: Request, res: Response): Promise<void> => {
  const filter = req.query as FilterBookingsDto;
  const { items, total } = await this.bookingService.list(req.user!.id, filter);
  this.paginated(res, items, total, filter.page, filter.limit, 'Bookings retrieved');
};

// Created
createBooking = async (req: Request, res: Response): Promise<void> => {
  const booking = await this.bookingService.create(req.user!.id, req.body);
  this.created(res, booking, 'Booking created successfully');
};

// No content (delete/deactivate)
deactivateAccount = async (req: Request, res: Response): Promise<void> => {
  await this.userService.deactivate(req.user!.id);
  this.noContent(res);
};
```

## Not Found Handler (404 for unknown routes)

```typescript
// middleware/notFound.middleware.ts
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundException('Route'));
};
```

## Health Check Endpoints

```typescript
// Routes
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/ready', async (_req, res) => {
  const dbOk = await prismaService.client.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const redisOk = await cacheService.get('__health').then(() => true).catch(() => false);
  const status = dbOk && redisOk ? 'ready' : 'degraded';
  res.status(dbOk && redisOk ? 200 : 503).json({ status, db: dbOk, redis: redisOk });
});
```
