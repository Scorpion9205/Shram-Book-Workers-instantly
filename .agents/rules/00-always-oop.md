# SHRAM Coding Rules — Always-On

## Rule 00: Class-Based OOP — Mandatory

Every module in this codebase uses **class-based OOP**. There are NO exported naked async functions acting as controllers, services, or repositories.

### ✅ CORRECT

```typescript
// controllers/AuthController.ts
export class AuthController extends BaseController {
  constructor(private readonly authService: IAuthService) {
    super();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const dto = await this.validate(RegisterDto, req.body);
    const result = await this.authService.register(dto);
    this.ok(res, result, 'Registration initiated');
  };
}
```

### ❌ WRONG — Never do this

```typescript
// ❌ naked exported async function
export const register = async (req: Request, res: Response) => { ... };

// ❌ static-only class (pure namespace anti-pattern)
export class AuthService {
  static async login() { ... }  // NO - inject dependencies instead
}
```

### Rules

1. **Controllers** extend `BaseController`
2. **Services** implement their module's `IXxxService` interface
3. **Repositories** implement `IXxxRepository` interface
4. **No static methods** on Service or Repository classes — use constructor injection
5. **Dependency Injection** via constructor params; wire in `container.ts` or module `index.ts`
6. Arrow-function class fields for route handlers (preserves `this` context)
