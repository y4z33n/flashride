import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { recordAuthFailure, recordAuthSuccess } from '../lib/metrics';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
}

/**
 * requireAuth middleware
 * ──────────────────────
 * Reads the Authorization: Bearer <token> header.
 * Validates the JWT with Supabase (getUser handles expiry, signature, etc.).
 * On success, attaches req.user = { id, email } and req.accessToken.
 * On failure, responds 401 — never passes through.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    recordAuthFailure();
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    recordAuthFailure();
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token.',
    });
    return;
  }

  // Attach user to request
  (req as AuthenticatedRequest).user = {
    id: data.user.id,
    email: data.user.email ?? '',
  };
  (req as AuthenticatedRequest).accessToken = token;

  recordAuthSuccess();
  next();
}
