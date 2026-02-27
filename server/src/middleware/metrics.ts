import { Request, Response, NextFunction } from 'express';
import { recordRequest } from '../lib/metrics';

/**
 * Hooks into the response `finish` event to record every request
 * in the metrics counters — after the response has been sent.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    recordRequest(req.method, res.statusCode);
  });
  next();
}
