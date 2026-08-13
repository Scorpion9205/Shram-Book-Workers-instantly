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
  protected buildSkip(page: number, limit: number): number {
    return (page - 1) * limit;
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
