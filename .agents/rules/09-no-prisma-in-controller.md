# SHRAM Coding Rules — Prisma Stays in Repository Layer

## Rule 09: Prisma Client Is Never Imported in Controllers or Services

The `PrismaClient` / `PrismaService` is **exclusively** used inside Repository classes. This enforces the Repository pattern and makes services fully unit-testable by mocking the repository interface.

### ✅ CORRECT — Prisma Only in Repositories

```typescript
// repositories/BookingRepository.ts ← ONLY place to import Prisma
import { PrismaService } from '../../../database/prisma/prisma.service.js';

export class BookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Booking | null> {
    return this.prisma.client.booking.findUnique({ where: { id } });
  }
}
```

### ❌ WRONG — Prisma in Service or Controller

```typescript
// ❌ In AuthService.ts
import prisma from '../../../shared/config/prisma.js'; // FORBIDDEN

async login(data: LoginInput) {
  const user = await prisma.user.findFirst({ ... }); // FORBIDDEN
}

// ❌ In AuthController.ts
import { PrismaClient } from '@prisma/client'; // FORBIDDEN
```

### How to Test Without a Real DB

When Prisma is only in the repository layer, you can unit test services like this:

```typescript
// tests/AuthService.test.ts
const mockUserRepo: jest.Mocked<IUserRepository> = {
  findByIdentifier: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const authService = new AuthService(mockOTPService, mockTokenService, mockUserRepo, mockCache);

it('should throw NotFoundException when user not found', async () => {
  mockUserRepo.findByIdentifier.mockResolvedValue(null);
  await expect(authService.login('email@x.com', 'wrongpass'))
    .rejects.toThrow(NotFoundException);
});
```

### Prisma Transactions

Transactions are initiated in the **Service** layer using `prisma.$transaction()` injected via `PrismaService`, but the actual query calls inside the transaction callback are still delegated to repository methods that accept an optional `tx` parameter.

```typescript
// In service
await this.prisma.transaction(async (tx) => {
  await this.userRepo.create(userData, tx);
  await this.profileRepo.create(profileData, tx);
});
```
