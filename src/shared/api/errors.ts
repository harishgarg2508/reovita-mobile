import type { AxiosError } from 'axios';

import type { ApiCodedErrorBody, ApiErrorBody } from './types';

// Codes the backend sends today. Keep in step with reovita-service.
export const API_ERROR_CODES = [
  'consent_required',
  'llm_consent_required',
  'profile_incomplete',
  'step_order_violation',
  'duplicate_report',
  'unsupported_file_type',
  'rate_limited',
  'report_not_found',
  'report_processing',
  'report_not_readable',
  'report_not_retryable',
  'report_not_replaceable',
  'account_deactivated',
  'invalid_report_state',
  'no_observations',
  'interpretation_not_found',
  'upload_conflict',
  'queue_unavailable',
  'validation_error',
  'collected_on_required',
  'location_required',
  'subject_not_found',
  'own_code',
  'request_not_found',
  'request_not_pending',
  'access_not_approved',
  'briefing_unavailable',
  'unauthorized',
  'unknown',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

const SNAKE_CODE = /^[a-z][a-z_]*$/;

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Turns any axios failure into an ApiError with a snake_case code. */
export function mapApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data as Partial<ApiErrorBody & ApiCodedErrorBody> | undefined;

  const message = Array.isArray(body?.message) ? body.message.join('; ') : (body?.message ?? error.message);

  // Prefer an explicit code in `error`, then in `message`.
  const explicit = [body?.error, typeof body?.message === 'string' ? body.message : undefined].find(
    (value): value is string => typeof value === 'string' && SNAKE_CODE.test(value),
  );

  if (explicit && (API_ERROR_CODES as readonly string[]).includes(explicit)) {
    return new ApiError(explicit as ApiErrorCode, status, message);
  }
  if (status === 401) return new ApiError('unauthorized', status, message);
  if (status === 429) return new ApiError('rate_limited', status, message);
  return new ApiError('unknown', status, message);
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
