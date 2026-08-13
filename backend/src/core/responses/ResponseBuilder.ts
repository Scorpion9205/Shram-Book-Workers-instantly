export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  errors?: FieldError[];
}

/**
 * Builds all SHRAM standard response envelopes.
 * Never call res.json() directly in controllers — use BaseController helpers instead.
 */
export class ResponseBuilder {
  static success<T>(data: T, message: string, meta?: PaginationMeta): SuccessResponse<T> {
    return {
      success: true,
      message,
      data,
      ...(meta !== undefined && { meta }),
    };
  }

  static error(
    message: string,
    errorCode: string,
    errors?: FieldError[],
  ): ErrorResponse {
    return {
      success: false,
      message,
      errorCode,
      ...(errors?.length && { errors }),
    };
  }

  static buildPaginationMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
