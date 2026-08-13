# SHRAM Coding Rules — Controller Responsibility

## Rule 02: Controllers Are Thin — Parse, Delegate, Respond

A controller does **exactly three things**: parse the incoming request, call one service method, and return the response. Zero business logic lives in a controller.

### Controller Responsibilities (Allowed)

1. Extract and validate request data (`req.body`, `req.params`, `req.query`, `req.user`)
2. Call **one** service method
3. Return the response via `ResponseBuilder` / `BaseController` helpers

### ✅ CORRECT

```typescript
export class BookingController extends BaseController {
  constructor(private readonly bookingService: IBookingService) {
    super();
  }

  createBooking = async (req: Request, res: Response): Promise<void> => {
    const dto = await this.validate(CreateBookingDto, req.body);
    const userId = req.user!.id;
    const booking = await this.bookingService.create(userId, dto);
    this.created(res, booking, 'Booking created successfully');
  };
}
```

### ❌ WRONG — Business logic in controller

```typescript
createBooking = async (req: Request, res: Response) => {
  // ❌ DB query in controller
  const worker = await prisma.worker.findUnique({ where: { id: req.body.workerId } });
  // ❌ Business calculation in controller
  const fare = worker.baseRate * req.body.hours;
  // ❌ Sending email in controller
  await emailService.send(...);
};
```

### Rules

- Max **5-10 lines** of actual logic per controller method
- Never import `prisma`, `RedisService`, or any repository directly in a controller
- Never import `emailService`, `smsService`, or any provider in a controller
- Never catch specific business errors in controllers — let `GlobalErrorHandler` handle them
- The only thing a controller catches is to re-throw a typed `AppException` if needed
