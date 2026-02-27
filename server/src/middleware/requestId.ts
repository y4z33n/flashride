import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique request ID to every incoming request.
 * Stored on req.id and echoed back in the X-Request-Id response header.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || uuidv4();
  (req as Request & { id: string }).id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
