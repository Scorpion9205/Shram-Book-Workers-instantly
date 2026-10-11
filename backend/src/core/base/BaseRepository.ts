export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Abstract base for all repositories.
 * Contains common helpers for pagination.
 */
export abstract class BaseRepository<T> {
  // Defense-in-depth: route-level Zod schemas are the primary guard against an unbounded
  // `?limit=` driving an effectively-unlimited DB query, but this is the one choke point every
  // paginated repository shares, so a future endpoint that forgets to clamp its own query
  // params still can't produce a runaway query here. Callers must use clampLimit() for the
  // `take` value too — buildSkip() alone only protects the skip math, not the page size.
  protected static readonly MAX_PAGE_LIMIT = 100;

  protected clampLimit(limit: number): number {
    return Number.isFinite(limit) && limit > 0 ? Math.min(limit, BaseRepository.MAX_PAGE_LIMIT) : 10;
  }

  protected buildSkip(page: number, limit: number): number {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    return (safePage - 1) * this.clampLimit(limit);
  }

  protected buildPaginatedResult<U>(
    items: U[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<U> {
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
