export interface ErrorDetail {
  field?: string;
  reason: string[];
}

export interface StandardErrorResponse {
  status: number;
  code: string;
  errors: ErrorDetail[];
}

interface ExceptionBody {
  status?: number;
  code?: string;
  error?: string;
  message?: string | string[];
  errors?: {
    field?: string;
    reason?: string[];
    messages?: string[];
  }[];
}

export class ErrorResponseBuilder {
  static build(exception: unknown, defaultStatus: number): StandardErrorResponse {
    if (!exception || typeof exception !== 'object') {
      return {
        status: defaultStatus,
        code: 'UNKNOWN_ERROR',
        errors: [],
      };
    }

    const body = exception as ExceptionBody;

    const status = body.status ?? defaultStatus;

    const primaryMessage = Array.isArray(body.message) ? body.message[0] : body.message;

    const code = body.code ?? this.normalizeCode(body.error ?? primaryMessage) ?? 'UNKNOWN_ERROR';

    const errors = Array.isArray(body.errors)
      ? body.errors.map((e) => ({
          field: e.field,
          reason: e.reason ?? e.messages ?? [],
        }))
      : [];

    return { status, code, errors };
  }

  private static normalizeCode(code?: string) {
    if (!code) return undefined;
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }
}
