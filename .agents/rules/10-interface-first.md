# SHRAM Coding Rules — Interface-First Design

## Rule 10: Every Service and Repository Has an Interface

Code to interfaces, not implementations. This enables mocking in tests, swapping implementations, and enforces clean contracts between layers.

### Required Interfaces Per Module

```
module/
  interfaces/
    IXxxController.ts   (optional — mostly for documentation)
    IXxxService.ts      (REQUIRED)
    IXxxRepository.ts   (REQUIRED)
```

### ✅ CORRECT

```typescript
// interfaces/IUserRepository.ts
export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByIdentifier(identifier: string): Promise<UserEntity | null>;
  create(data: CreateUserDto): Promise<UserEntity>;
  update(id: string, data: Partial<UpdateUserDto>): Promise<UserEntity>;
  existsByEmail(email: string): Promise<boolean>;
  existsByPhone(phone: string): Promise<boolean>;
  softDelete(id: string): Promise<void>;
}

// interfaces/IUserService.ts
export interface IUserService {
  getProfile(userId: string): Promise<UserProfileDto>;
  updateProfile(userId: string, data: UpdateProfileDto): Promise<UserProfileDto>;
  deactivateAccount(userId: string): Promise<void>;
  listUsers(filter: UserFilterDto, pagination: PaginationDto): Promise<PaginatedResult<UserProfileDto>>;
}

// UserService.ts — implements the interface
export class UserService implements IUserService {
  constructor(private readonly userRepo: IUserRepository) {}
  ...
}
```

### ❌ WRONG

```typescript
// ❌ Depending on concrete class
constructor(private readonly userRepo: UserRepository) {} // use IUserRepository

// ❌ No interface — service directly referenced
import { UserService } from './UserService.js';
class SomeOtherService {
  constructor(private readonly userService: UserService) {} // use IUserService
}
```

### Provider Interfaces (core/providers)

External providers also have interfaces so they're swappable:

```typescript
// providers/email/IEmailProvider.ts
export interface IEmailProvider {
  send(to: string, subject: string, html: string): Promise<void>;
}

// providers/sms/ISmsProvider.ts
export interface ISmsProvider {
  send(to: string, message: string): Promise<void>;
}

// providers/payment/IPaymentProvider.ts
export interface IPaymentProvider {
  createOrder(amount: number, currency: string, receiptId: string): Promise<PaymentOrder>;
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
}

// providers/storage/IStorageProvider.ts
export interface IStorageProvider {
  upload(key: string, file: Buffer, mimetype: string): Promise<string>; // returns URL
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}
```

The actual implementations (`ResendProvider`, `ExotelProvider`, `RazorpayProvider`, `S3Provider`) are wired in bootstrap — consuming code only sees the interface.
