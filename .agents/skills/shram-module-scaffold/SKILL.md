---
name: shram-module-scaffold
description: >-
  Use this skill when scaffolding a new SHRAM backend module from scratch.
  Covers the exact 15-folder structure, what goes in each folder,
  and how to wire the module into app.ts and the DI container.
  Activate when: user asks to create a new module, add a new domain feature,
  or asks "how to structure a module" in the SHRAM backend.
---

# SHRAM — Scaffold a New Backend Module

Every module in SHRAM follows the same 15-folder structure. Use this guide each time.

## Target Structure

```
modules/<module-name>/
├── controllers/
│   └── XxxController.ts
├── services/
│   └── XxxService.ts
├── repositories/
│   └── XxxRepository.ts
├── routes/
│   └── xxx.routes.ts
├── dto/
│   ├── CreateXxx.dto.ts
│   └── UpdateXxx.dto.ts
├── validators/
│   └── xxx.validator.ts          ← complex cross-field Zod refinements
├── entities/
│   └── Xxx.entity.ts             ← domain entity shape (not Prisma model)
├── mappers/
│   └── Xxx.mapper.ts             ← Prisma model → entity/DTO transforms
├── interfaces/
│   ├── IXxxService.ts
│   └── IXxxRepository.ts
├── types/
│   └── XxxTypes.ts               ← small TS types specific to this module
├── constants/
│   └── xxx.constants.ts
├── enums/
│   └── XxxStatus.ts
├── events/
│   └── xxx-created.event.ts      ← event payload types
├── sockets/
│   └── xxx.socket.ts             ← socket event handlers (if needed)
├── helpers/
│   └── xxxHelper.ts              ← business-specific helpers
├── utils/
│   └── xxxUtil.ts                ← generic reusable utilities
├── policies/
│   └── XxxPolicy.ts              ← authorization rules
├── permissions/
│   └── xxx.permissions.ts        ← permission constants
└── index.ts                      ← barrel export
```

## Step-by-Step Scaffold

### Step 1: Create folder tree

```powershell
$module = "payments"  # change this
$base = "backend\src\modules\$module"
$folders = @("controllers","services","repositories","routes","dto","validators","entities","mappers","interfaces","types","constants","enums","events","sockets","helpers","utils","policies","permissions","tests")
foreach ($f in $folders) { New-Item -ItemType Directory -Force -Path "$base\$f" }
```

### Step 2: Create the Interface files first

```typescript
// interfaces/IPaymentService.ts
export interface IPaymentService {
  createOrder(bookingId: string, amount: number): Promise<PaymentOrder>;
  verifyPayment(paymentId: string, orderId: string, signature: string): Promise<void>;
  // ... other methods
}

// interfaces/IPaymentRepository.ts
export interface IPaymentRepository {
  create(data: CreatePaymentData): Promise<Payment>;
  findByBookingId(bookingId: string): Promise<Payment | null>;
  updateStatus(id: string, status: PaymentStatus): Promise<Payment>;
}
```

### Step 3: Create the Repository (implements IXxxRepository)

```typescript
// repositories/PaymentRepository.ts
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { IPaymentRepository } from '../interfaces/IPaymentRepository.js';

export class PaymentRepository extends BaseRepository<Payment> implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async create(data: CreatePaymentData): Promise<Payment> {
    return this.prisma.client.payment.create({ data });
  }
}
```

### Step 4: Create the Service (implements IXxxService)

```typescript
// services/PaymentService.ts
export class PaymentService implements IPaymentService {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly bookingRepo: IBookingRepository,
    private readonly paymentProvider: IPaymentProvider,
    private readonly eventPublisher: IEventPublisher,
    private readonly cache: ICacheService,
  ) {}

  async createOrder(bookingId: string, amount: number): Promise<PaymentOrder> {
    // ... business logic
  }
}
```

### Step 5: Create the Controller (extends BaseController)

```typescript
// controllers/PaymentController.ts
export class PaymentController extends BaseController {
  constructor(private readonly paymentService: IPaymentService) { super(); }

  createOrder = async (req: Request, res: Response): Promise<void> => {
    const dto = req.validatedBody as CreateOrderDto;
    const order = await this.paymentService.createOrder(dto.bookingId, dto.amount);
    this.created(res, order, 'Payment order created');
  };
}
```

### Step 6: Create Routes

```typescript
// routes/payment.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/index.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { CreateOrderSchema } from '../dto/CreateOrder.dto.js';
import { Role } from '../../../core/enums/Role.js';

export function createPaymentRouter(controller: PaymentController): Router {
  const router = Router();
  router.post('/orders', authenticate, authorize(Role.PROVIDER), validate(CreateOrderSchema), controller.createOrder);
  return router;
}
```

### Step 7: Create index.ts Barrel

```typescript
// index.ts
export { PaymentController } from './controllers/PaymentController.js';
export { PaymentService } from './services/PaymentService.js';
export { PaymentRepository } from './repositories/PaymentRepository.js';
export type { IPaymentService } from './interfaces/IPaymentService.js';
export type { IPaymentRepository } from './interfaces/IPaymentRepository.js';
export { createPaymentRouter } from './routes/payment.routes.js';
```

### Step 8: Wire into app.ts

```typescript
// app.ts
import { createPaymentRouter, PaymentController, PaymentService, PaymentRepository } from './modules/payments/index.js';

const paymentRepo = new PaymentRepository(prismaService);
const paymentService = new PaymentService(paymentRepo, bookingRepo, razorpayProvider, eventPublisher, cacheService);
const paymentController = new PaymentController(paymentService);
app.use('/api/v1/payments', createPaymentRouter(paymentController));
```

## Checklist Before PR

- [ ] Interface defined before implementation
- [ ] Repository only uses Prisma (no business logic)
- [ ] Service implements the interface
- [ ] Controller extends BaseController
- [ ] All DTOs are Zod schemas
- [ ] Routes use `validate()` middleware before controller
- [ ] `index.ts` barrel exports everything
- [ ] No `throw new Error()` — only typed exceptions
- [ ] Module wired in `app.ts` or bootstrap
