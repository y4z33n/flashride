import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';
import { recordRequest } from '../lib/metrics';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Central error handler — must be registered LAST in Express.
 * - In production: never leaks stack traces to the client.
 * - Always returns a consistent JSON shape.
 * - Records metrics for every error.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const reqWithId = req as Request & { id?: string };
  const statusCode = err.statusCode ?? 500;
  const requestId = reqWithId.id;

  // Structured server-side log — never omit stack in logs
  logger.error(err.message, {
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    code: err.code,
    ...(config.server.isDev && { stack: err.stack }),
  });

  // Record in metrics
  recordRequest(req.method, statusCode);

  // Client response — never leak stack traces in production
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    ...(err.code && { code: err.code }),
    requestId,
    ...(config.server.isDev && statusCode >= 500 && { detail: err.message }),
  });
}

/**
 * Helper: create an error with a custom HTTP status code.
 * Use this to throw predictable errors from route handlers.
 */
export function createError(message: string, statusCode = 500, code?: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}
