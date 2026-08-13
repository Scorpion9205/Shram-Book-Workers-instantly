/**
 * SHRAM user roles.
 * Used in JWT payload, RBAC middleware, and permission checks.
 */
export enum UserRole {
  PROVIDER = 'PROVIDER',
  WORKER = 'WORKER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}
