// Shared response envelopes. Nothing entity-specific belongs here.

/** Error body written by reovita-service's ApiExceptionFilter (snake_case). */
export interface ApiErrorBody {
  status_code: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

/** Some backend routes return { error: <code>, message } instead of the filter shape. */
export interface ApiCodedErrorBody {
  error: string;
  message: string;
}
