import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimiter';
import { createError, parseBody } from '../middleware/errorHandler';
import { ratingService } from '../services/ratingService';
import { reportService } from '../services/reportService';
import { auditService } from '../services/auditService';
import { submitRatingSchema, submitReportSchema, uuidParam } from '../lib/schemas';

const router = Router();

/** Validate a UUID path param — returns false and calls next(400) if invalid. */
function validateId(id: string, next: NextFunction): boolean {
  if (!uuidParam.safeParse(id).success) {
    next(createError('Invalid ID — must be a valid UUID.', 400, 'INVALID_ID'));
    return false;
  }
  return true;
}

/** Map typed service error codes to HTTP status codes. */
function ratingErrorStatus(code: string): number {
  switch (code) {
    case 'ALREADY_RATED':          return 409;
    case 'SELF_RATING':            return 422;
    case 'RIDE_NOT_FOUND':         return 404;
    case 'RIDE_NOT_COMPLETED':     return 409;
    case 'NOT_A_PARTICIPANT':      return 403;
    case 'RATED_NOT_A_PARTICIPANT':return 403;
    default:                       return 500;
  }
}

// ── Ratings ───────────────────────────────────────────────────────────

/**
 * POST /rides/:id/rate
 * Submit a rating for another participant on a completed ride.
 *
 * Guards:
 *  - Ride must be completed
 *  - Rater must be a participant (driver or accepted rider)
 *  - Rated user must be a participant
 *  - Cannot rate yourself
 *  - Duplicate: 409
 */
router.post(
  '/rides/:id/rate',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { user } = req as AuthenticatedRequest;

      const body = parseBody(submitRatingSchema, req.body, next);
      if (!body) return;

      const rating = await ratingService.submit(
        req.params.id,
        user.id,
        body.rated_id,
        body.score,
        body.comment
      );

      auditService.logEvent({
        actorId: user.id,
        action: 'rating.submitted',
        entityType: 'rating',
        entityId: rating.id,
        metadata: { ride_id: req.params.id, rated_id: body.rated_id, score: body.score },
        ipAddress: req.ip,
      });

      res.status(201).json(rating);
    } catch (err: any) {
      const status = ratingErrorStatus(err.code ?? '');
      if (status !== 500) {
        return next(createError(err.message, status, err.code));
      }
      next(err);
    }
  }
);

/**
 * GET /rides/:id/ratings
 * Get all ratings for a ride.
 */
router.get(
  '/rides/:id/ratings',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const ratings = await ratingService.getForRide(req.params.id);
      res.status(200).json(ratings);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /users/:id/ratings
 * Get all ratings for a user (public — shows their score history).
 */
router.get(
  '/users/:id/ratings',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const ratings = await ratingService.getForUser(req.params.id);
      res.status(200).json(ratings);
    } catch (err) {
      next(err);
    }
  }
);

// ── Reports ───────────────────────────────────────────────────────────

/**
 * POST /users/:id/report
 * Report a user for a safety/conduct issue.
 *
 * Guards:
 *  - Cannot report yourself
 *  - Duplicate (same reporter + reported + reason within 24h): 409
 */
router.post(
  '/users/:id/report',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { user } = req as AuthenticatedRequest;

      const body = parseBody(submitReportSchema, req.body, next);
      if (!body) return;

      const report = await reportService.submit(
        user.id,
        req.params.id,
        body.reason,
        body.description,
        body.ride_id
      );

      auditService.logEvent({
        actorId: user.id,
        action: 'report.created',
        entityType: 'report',
        entityId: report.id,
        metadata: { reported_user_id: req.params.id, reason: body.reason, ride_id: body.ride_id },
        ipAddress: req.ip,
      });

      res.status(201).json({ id: report.id, status: report.status, message: 'Report submitted. Our team will review it.' });
    } catch (err: any) {
      if (err.code === 'DUPLICATE_REPORT') return next(createError(err.message, 409, err.code));
      if (err.code === 'SELF_REPORT')      return next(createError(err.message, 422, err.code));
      next(err);
    }
  }
);

export default router;
