# SHRAM Coding Rules — Repository Is Prisma-Only

## Rule 04: Repositories Contain Only Prisma Queries

Repositories are the **only** layer that touches Prisma. They are fully mockable data-access objects with zero business logic.

### ✅ CORRECT

```typescript
// IUserRepository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByIdentifier(identifier: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: Partial<UpdateUserData>): Promise<User>;
  softDelete(id: string): Promise<void>;
}

// UserRepository.ts
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return this.prisma.client.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.client.user.create({ data });
  }
}
```

### ❌ WRONG — Business logic in repository

```typescript
export class UserRepository {
  async findAndValidate(identifier: string) {
    const user = await prisma.user.findFirst(...);
    // ❌ Business logic in repo
    if (!user) throw new Error('User not found');
    if (!user.isActive) throw new Error('Account deactivated');
    return user;
  }
}
```

### Rules

- Repository methods return `Model | null` — they **never throw** for "not found" (service decides)
- Only exception: `update`/`delete` can throw `DatabaseException` on Prisma errors
- Wrap Prisma errors in `DatabaseException` — never let Prisma errors reach the controller
- Transactions are started in the **service** layer and passed to repo methods, or done via `prisma.$transaction()`
- Repositories are fully mockable — tests should never need a real DB connection for service tests
- `BaseRepository<T>` provides common helpers: `paginate()`, `count()`, `exists()`
