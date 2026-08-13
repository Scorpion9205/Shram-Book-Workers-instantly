# SHRAM Coding Rules — Standard Response Envelope

## Rule 06: All API Responses Use the Standard Envelope

Every API response — success or error — follows this exact JSON shape. Nothing else.

### Success Envelope

```json
{
  "success": true,
  "message": "Booking created successfully.",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

`meta` is **only** present on paginated list responses. Omit it for single-resource responses.

### Error Envelope

```json
{
  "success": false,
  "message": "Validation failed.",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    { "field": "phone", "message": "Phone number is required" }
  ]
}
```

### BaseController Helpers

```typescript
// In BaseController — use these, never call res.json() manually
this.ok(res, data, 'Message');              // 200
this.created(res, data, 'Message');         // 201
this.noContent(res);                        // 204
this.paginated(res, items, meta, 'Message');// 200 with meta

// GlobalErrorHandler sends error envelopes — controllers never construct error responses
```

### ✅ CORRECT

```typescript
createBooking = async (req: Request, res: Response): Promise<void> => {
  const dto = await this.validate(CreateBookingDto, req.body);
  const booking = await this.bookingService.create(req.user!.id, dto);
  this.created(res, booking, 'Booking created successfully');
};
```

### ❌ WRONG

```typescript
// ❌ manual res.json with non-standard shape
res.json({ booking, token: '...' });

// ❌ status-only without envelope
res.status(200).send('OK');

// ❌ non-standard error construction in controller
res.status(400).json({ error: 'Bad request' });

// ❌ Prisma error leaking to client
catch (e) { res.status(500).json({ error: e.message }); }
```

### ResponseBuilder Utility

```typescript
// core/responses/ResponseBuilder.ts
export class ResponseBuilder {
  static success<T>(data: T, message: string, meta?: PaginationMeta) {
    return { success: true, message, data, ...(meta && { meta }) };
  }

  static error(message: string, errorCode: string, errors?: FieldError[]) {
    return { success: false, message, errorCode, ...(errors && { errors }) };
  }
}
```
