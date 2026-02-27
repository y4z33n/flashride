import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createUserClient } from '../lib/supabase';
import { profileService } from '../services/profileService';
import { createError, parseBody } from '../middleware/errorHandler';
import { profileUpdateSchema, uuidParam } from '../lib/schemas';

const router = Router();

// ── Routes ────────────────────────────────────────────────────────────

/**
 * GET /me
 * Returns the authenticated user's auth identity + their full DB profile.
 * Uses the RLS-scoped user client so RLS is always enforced.
 * If the profile row doesn't exist yet returns auth identity only.
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, accessToken } = req as AuthenticatedRequest;
    const userClient = createUserClient(accessToken);
    const profile = await profileService.getById(user.id, userClient);

    res.status(200).json({
      id: user.id,
      email: user.email,
      profile: profile ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /users/:id
 * Returns a public profile. Email stripped.
 */
router.get('/users/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!uuidParam.safeParse(req.params.id).success) {
      return next(createError('Invalid ID — must be a valid UUID.', 400, 'INVALID_ID'));
    }
    const { accessToken } = req as AuthenticatedRequest;
    const userClient = createUserClient(accessToken);
    const profile = await profileService.getById(req.params.id, userClient);

    if (!profile) {
      return next(createError('User not found.', 404, 'NOT_FOUND'));
    }

    const { email: _email, ...publicProfile } = profile;
    res.status(200).json(publicProfile);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /me
 * Update the authenticated user's own profile.
 */
router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, accessToken } = req as AuthenticatedRequest;

    const body = parseBody(profileUpdateSchema, req.body, next);
    if (!body) return;

    if (Object.keys(body).length === 0) {
      return next(createError('No valid fields provided for update.', 400, 'EMPTY_UPDATE'));
    }

    const userClient = createUserClient(accessToken);
    const updated = await profileService.updateOwn(user.id, body, userClient);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
