import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimiter';
import { rideRequestService } from '../services/rideRequestService';
import { auditService } from '../services/auditService';
import { createError } from '../middleware/errorHandler';

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────

const claimSeatSchema = z.object({
  seats: z.number().int().min(1).max(4).default(1),
});

// ── Routes ────────────────────────────────────────────────────────────

/**
 * POST /rides/:id/request
 * Rider submits a join request for a ride.
 * Uses the atomic claim_seat Postgres RPC — no race conditions.
 */
router.post(
  '/rides/:id/request',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const rideId = req.params.id;

      const parsed = claimSeatSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(createError('Invalid request body.', 400, 'VALIDATION_ERROR'));
      }

      const result = await rideRequestService.claimSeat(
        rideId,
        user.id,
        parsed.data.seats
      );

      if (!result.success) {
        // Business-logic rejection from Postgres — 409 Conflict
        res.status(409).json({
          error: result.code,
          message: result.message,
          ...(result.seats_available !== undefined && {
            seats_available: result.seats_available,
          }),
        });
        return;
      }

      // Audit the request creation (fire-and-forget)
      auditService.logEvent({
        actorId: user.id,
        action: 'request.created',
        entityType: 'request',
        entityId: result.request_id,
        metadata: { ride_id: rideId, seats: parsed.data.seats },
        ipAddress: req.ip,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /requests/:id/accept
 * Driver accepts a pending ride request.
 * Uses the atomic accept_ride_request Postgres RPC.
 */
router.post(
  '/requests/:id/accept',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const requestId = req.params.id;

      const result = await rideRequestService.acceptRequest(requestId, user.id);

      if (!result.success) {
        res.status(409).json({
          error: result.code,
          message: result.message,
        });
        return;
      }

      auditService.logEvent({
        actorId: user.id,
        action: 'request.accepted',
        entityType: 'request',
        entityId: requestId,
        metadata: { ride_id: result.ride_id },
        ipAddress: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /requests/:id/reject
 * Driver rejects a pending ride request.
 */
router.post(
  '/requests/:id/reject',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const requestId = req.params.id;

      await rideRequestService.rejectRequest(requestId, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'request.rejected',
        entityType: 'request',
        entityId: requestId,
        ipAddress: req.ip,
      });

      res.status(200).json({ success: true, message: 'Request rejected.' });
    } catch (err) {
      const appErr = createError((err as Error).message, 400, 'REJECT_FAILED');
      next(appErr);
    }
  }
);

/**
 * POST /requests/:id/cancel
 * Rider cancels their own request.
 */
router.post(
  '/requests/:id/cancel',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const requestId = req.params.id;

      await rideRequestService.cancelRequest(requestId, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'request.cancelled',
        entityType: 'request',
        entityId: requestId,
        ipAddress: req.ip,
      });

      res.status(200).json({ success: true, message: 'Request cancelled.' });
    } catch (err) {
      const appErr = createError((err as Error).message, 400, 'CANCEL_FAILED');
      next(appErr);
    }
  }
);

export default router;
