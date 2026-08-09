import { ZodError } from "zod";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "REQUIRES_IDENTITY_PROVIDER";

export type ApiErrorPayload = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: Record<string, unknown> | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return new ApiError(
      "VALIDATION_ERROR",
      firstIssue?.message ?? "Dữ liệu gửi lên không hợp lệ.",
      400,
      {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      },
    );
  }
  return new ApiError("INTERNAL_ERROR", "Đã có lỗi máy chủ xảy ra.", 500);
}

export function createApiErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  const payload: ApiErrorPayload = {
    ok: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
    },
  };

  return new Response(JSON.stringify(payload), {
    status: apiError.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  if (payload?.error) {
    throw new ApiError(
      payload.error.code,
      payload.error.message,
      response.status,
      payload.error.details,
    );
  }

  throw new ApiError("INTERNAL_ERROR", "Không thể xử lý phản hồi máy chủ.", response.status);
}
