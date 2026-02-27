import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { auditService } from '../services/auditService';

/**
 * requireAdmin middleware
 * ────────────────────────────────────────────────────────────────────
 * Protects all /admin/* routes with a static shared secret.
 *
 * The client must send:
 *   Authorization: Bearer <ADMIN_SECRET>
 *
 * Why a static secret instead of a user JWT?
 *  - Admin operations (block user, resolve report) should not be tied
 *    to any one user account — they survive password resets and logouts.
 *  - The secret is stored only in server env vars and the admin tool.
 *  - In a future v2, swap this for short-lived signed tokens.
 *
 * Security rules:
 *  - If ADMIN_SECRET is empty/unset, admin routes are disabled entirely
 *    (returns 503) — prevents accidental open access on mis-configured deploys.
 *  - Constant-time comparison prevents timing attacks.
 *  - Every admin action is written to audit_events.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Hard block if secret is not configured
  if (!config.admin.secret || config.admin.secret === 'change-me-use-openssl-rand-hex-32') {
    res.status(503).json({
      error: 'ADMIN_DISABLED',
      message: 'Admin endpoints are not configured on this server.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing Authorization header.',
    });
    return;
  }

  const provided = authHeader.slice(7);

  // Constant-time comparison — prevents timing side-channel
  if (!timingSafeEqual(provided, config.admin.secret)) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid admin secret.',
    });
    return;
  }

  // Log every successful admin access
  auditService.logEvent({
    actorId: null,
    action: 'admin.login',
    entityType: 'session',
    metadata: { path: req.path, method: req.method },
    ipAddress: req.ip,
  });

  next();
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
