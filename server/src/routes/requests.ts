import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimiter';
import { rideRequestService } from '../services/rideRequestService';
import { auditService } from '../services/auditService';
import { pushService } from '../services/pushService';
import { supabaseAdmin } from '../lib/supabase';
import { createError, parseBody } from '../middleware/errorHandler';
import { claimSeatSchema, uuidParam } from '../lib/schemas';

const router = Router();

/** Validate a UUID path param — returns false and calls next(400) if invalid. */
function validateId(id: string, next: NextFunction): boolean {
  if (!uuidParam.safeParse(id).success) {
    next(createError('Invalid ID — must be a valid UUID.', 400, 'INVALID_ID'));
    return false;
  }
  return true;
}

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
      if (!validateId(req.params.id, next)) return;
      const { user } = req as AuthenticatedRequest;
      const rideId = req.params.id;

      const body = parseBody(claimSeatSchema, req.body, next);
      if (!body) return;

      const result = await rideRequestService.claimSeat(
        rideId,
        user.id,
        body.seats
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
        metadata: { ride_id: rideId, seats: body.seats },
        ipAddress: req.ip,
      });

      // Notify the driver (fire-and-forget — never delays the response)
      supabaseAdmin
        .from('rides')
        .select('driver_id, destination_address, profiles!driver_id(full_name)')
        .eq('id', rideId)
        .single()
        .then(({ data: ride }) => {
          if (!ride) return;
          // Get rider name for the notification
          supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()
            .then(({ data: riderProfile }) => {
              const riderName = riderProfile?.full_name ?? 'Someone';
              const dest = ride.destination_address.split(',')[0];
              pushService.sendToUser(
                ride.driver_id,
                'New Ride Request 🙋',
                `${riderName} wants to join your ride to ${dest}`,
                { rideId, requestId: result.request_id }
              );
            });
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
      if (!validateId(req.params.id, next)) return;
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

      // Notify the rider their request was accepted (fire-and-forget)
      supabaseAdmin
        .from('ride_requests')
        .select('rider_id, rides!inner(destination_address)')
        .eq('id', requestId)
        .single()
        .then(({ data: req }) => {
          if (!req) return;
          const dest = (req.rides as any).destination_address.split(',')[0];
          pushService.sendToUser(
            req.rider_id,
            'Request Accepted 🎉',
            `You're confirmed on the ride to ${dest}!`,
            { rideId: result.ride_id, requestId }
          );
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
      if (!validateId(req.params.id, next)) return;
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

      // Notify the rider their request was declined (fire-and-forget)
      supabaseAdmin
        .from('ride_requests')
        .select('rider_id, rides!inner(destination_address)')
        .eq('id', requestId)
        .single()
        .then(({ data: req }) => {
          if (!req) return;
          const dest = (req.rides as any).destination_address.split(',')[0];
          pushService.sendToUser(
            req.rider_id,
            'Request Declined',
            `Your request for the ride to ${dest} was declined.`,
            { requestId }
          );
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
      if (!validateId(req.params.id, next)) return;
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
