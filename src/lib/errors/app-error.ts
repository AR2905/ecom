export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "OUT_OF_STOCK"
  | "EXPIRED"
  | "BUSINESS_RULE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown) {
    super("VALIDATION_ERROR", 400, "Invalid request", details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor() {
    super("UNAUTHENTICATED", 401, "Authentication required");
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("FORBIDDEN", 403, "Permission denied");
  }
}

export class NotFoundError extends AppError {
  constructor() {
    super("NOT_FOUND", 404, "Resource not found");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super("CONFLICT", 409, message);
  }
}

export class OutOfStockError extends AppError {
  constructor(details?: unknown) {
    super("OUT_OF_STOCK", 409, "Requested quantity is unavailable", details);
  }
}

export class ExpiredError extends AppError {
  constructor(message = "Resource has expired") {
    super("EXPIRED", 409, message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message = "Business rule violated") {
    super("BUSINESS_RULE", 422, message);
  }
}

export class RateLimitedError extends AppError {
  constructor() {
    super("RATE_LIMITED", 429, "Too many requests");
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super("INTERNAL_ERROR", 500, message);
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
