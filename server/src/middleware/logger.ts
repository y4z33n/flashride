import morgan from 'morgan';
import { Request, Response } from 'express';

/**
 * HTTP request logger.
 * Dev:  colored, concise output to stdout.
 * Prod: JSON-like format with request ID, method, path, status, latency.
 */

const devFormat =
  ':method :url :status :response-time ms — :res[content-length] bytes | req-id: :req[x-request-id]';

const prodFormat = JSON.stringify({
  requestId: ':req[x-request-id]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  time: ':date[iso]',
});

export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  {
    skip: (_req: Request, res: Response) => {
      // In production, skip logging successful health checks to reduce noise
      return process.env.NODE_ENV === 'production' && res.statusCode < 400;
    },
  }
);
