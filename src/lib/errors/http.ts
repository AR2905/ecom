import { isAppError, type ErrorCode } from "@/lib/errors/app-error";
import { requestLogger } from "@/lib/logging/logger";

export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId: string;
  };
};

export function toErrorBody(error: unknown, requestId: string): ErrorBody {
  if (isAppError(error)) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId,
      },
    };
  }

  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId,
    },
  };
}

export function toStatus(error: unknown): number {
  return isAppError(error) ? error.status : 500;
}

export function reportError(error: unknown, requestId: string): void {
  const log = requestLogger(requestId);

  if (isAppError(error)) {
    log.warn({ code: error.code, status: error.status }, error.message);
    return;
  }

  log.error({ err: error }, "Unhandled error");
}
