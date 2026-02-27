import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createUserClient } from '../lib/supabase';
import { profileService } from '../services/profileService';

const router = Router();

// ── Validation schema ────────────────────────────────────────────────

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  avatar_url: z.string().url().optional(),
  is_driver: z.boolean().optional(),
  vehicle_info: z.string().max(200).optional(),
});

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
 * Returns a public profile for any authenticated user to view.
 * Email is stripped from the public response.
 */
router.get('/users/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req as AuthenticatedRequest;
    const userClient = createUserClient(accessToken);
    const profile = await profileService.getById(req.params.id, userClient);

    if (!profile) {
      res.status(404).json({ error: 'Not Found', message: 'User not found.' });
      return;
    }

    // Strip email from public view
    const { email: _email, ...publicProfile } = profile;
    res.status(200).json(publicProfile);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /me
 * Update the authenticated user's own profile.
 * RLS on the DB ensures only the user's own row can be updated.
 */
router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, accessToken } = req as AuthenticatedRequest;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request body.',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'No valid fields provided for update.',
      });
      return;
    }

    const userClient = createUserClient(accessToken);
    const updated = await profileService.updateOwn(user.id, parsed.data, userClient);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
