import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { logger } from '../lib/logger';
import { recordRequest } from '../lib/metrics';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Canonical API error shape — every error response from this server
 * follows this exact structure. Clients can always rely on `error` and
 * `message` being present.
 *
 * {
 *   "error":     "VALIDATION_ERROR",      // machine-readable code
 *   "message":   "seats must be 1–4",     // human-readable description
 *   "details":   { "seats": ["..."] },    // optional field-level detail
 *   "requestId": "abc-123"                // for support / log correlation
 * }
 */

/**
 * Central error handler — must be registered LAST in Express.
 * - In production: never leaks stack traces to the client.
 * - Always returns the canonical JSON shape above.
 * - Records metrics for every error.
 */
export function errorHandler(
  err: AppError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const reqWithId = req as Request & { id?: string };
  const requestId = reqWithId.id;

  // ── Handle ZodErrors thrown directly (not wrapped) ────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
      details: err.flatten().fieldErrors,
      requestId,
    });
    return;
  }

  const appErr = err as AppError;
  const statusCode = appErr.statusCode ?? 500;

  // Structured server-side log
  logger.error(appErr.message, {
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    code: appErr.code,
    ...(config.server.isDev && { stack: appErr.stack }),
  });

  recordRequest(req.method, statusCode);

  // 5xx — never leak internal detail to client in production
  if (statusCode >= 500) {
    res.status(statusCode).json({
      error: 'INTERNAL_ERROR',
      message: config.server.isDev ? appErr.message : 'An unexpected error occurred.',
      requestId,
    });
    return;
  }

  // 4xx — structured client error
  res.status(statusCode).json({
    error: appErr.code ?? 'REQUEST_ERROR',
    message: appErr.message,
    ...(appErr.details !== undefined && { details: appErr.details }),
    requestId,
  });
}

/**
 * Helper: create an AppError with HTTP status + machine-readable code.
 */
export function createError(
  message: string,
  statusCode = 500,
  code?: string,
  details?: unknown
): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  if (code) err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

/**
 * parseBody: validate req.body with a Zod schema.
 * Returns parsed data or calls next() with a structured 400 error.
 * Usage: const data = parseBody(schema, req.body, next); if (!data) return;
 */
export function parseBody<T>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
  body: unknown,
  next: NextFunction
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    next(createError(
      'Request validation failed.',
      400,
      'VALIDATION_ERROR',
      result.error.flatten().fieldErrors
    ));
    return null;
  }
  return result.data;
}

/**
 * parseQuery: same as parseBody but for query string parameters.
 */
export function parseQuery<T>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
  query: unknown,
  next: NextFunction
): T | null {
  const result = schema.safeParse(query);
  if (!result.success) {
    next(createError(
      'Invalid query parameters.',
      400,
      'VALIDATION_ERROR',
      result.error.flatten().fieldErrors
    ));
    return null;
  }
  return result.data;
}

