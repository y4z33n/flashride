import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimiter';
import { createError, parseBody, parseQuery } from '../middleware/errorHandler';
import { rideService } from '../services/rideService';
import { messageService } from '../services/messageService';
import { locationService } from '../services/locationService';
import { auditService } from '../services/auditService';
import { pushService } from '../services/pushService';
import { supabaseAdmin } from '../lib/supabase';
import {
  createRideSchema,
  searchRideSchema,
  sendMessageSchema,
  locationSchema,
  messagesQuerySchema,
  uuidParam,
} from '../lib/schemas';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────

/** Returns all accepted rider IDs for a ride (for broadcast notifications). */
async function getAcceptedRiderIds(rideId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('ride_requests')
    .select('rider_id')
    .eq('ride_id', rideId)
    .eq('status', 'accepted');
  return (data ?? []).map((r: { rider_id: string }) => r.rider_id);
}

/** Validate a UUID path param — returns false and calls next(400) if invalid. */
function validateId(id: string, next: NextFunction): boolean {
  if (!uuidParam.safeParse(id).success) {
    next(createError('Invalid ID — must be a valid UUID.', 400, 'INVALID_ID'));
    return false;
  }
  return true;
}

// ── Rides ─────────────────────────────────────────────────────────────

/**
 * POST /rides
 * Offer a new ride. driver_id is always taken from JWT — never from body.
 */
router.post(
  '/rides',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;

      const body = parseBody(createRideSchema, req.body, next);
      if (!body) return;

      if (new Date(body.departure_time) <= new Date()) {
        return next(createError('departure_time must be in the future.', 400, 'INVALID_DEPARTURE_TIME'));
      }

      const ride = await rideService.create(user.id, body);

      auditService.logEvent({
        actorId: user.id,
        action: 'ride.created',
        entityType: 'ride',
        entityId: ride.id,
        metadata: { origin: ride.origin_address, destination: ride.destination_address },
        ipAddress: req.ip,
      });

      res.status(201).json(ride);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /rides/search
 * Search open rides by date (and optionally proximity).
 * Defined before /rides/:id to avoid route shadowing.
 */
router.get(
  '/rides/search',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseQuery(searchRideSchema, req.query, next);
      if (!query) return;

      const result = await rideService.search(query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /rides/:id
 * Get a ride with driver profile and requests.
 */
router.get(
  '/rides/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { accessToken } = req as AuthenticatedRequest;
      const ride = await rideService.getById(req.params.id, accessToken);

      if (!ride) return next(createError('Ride not found.', 404, 'NOT_FOUND'));

      res.status(200).json(ride);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /rides/:id/start
 * Driver marks ride as in_progress.
 */
router.post(
  '/rides/:id/start',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { user } = req as AuthenticatedRequest;
      const ride = await rideService.start(req.params.id, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'ride.started',
        entityType: 'ride',
        entityId: ride.id,
        ipAddress: req.ip,
      });

      getAcceptedRiderIds(ride.id).then(riderIds => {
        if (riderIds.length === 0) return;
        const dest = ride.destination_address.split(',')[0];
        pushService.sendToUsers(riderIds, 'Your Ride Has Started 🚗',
          `Head to the pickup point — your ride to ${dest} is on the way!`,
          { rideId: ride.id }
        );
      });

      res.status(200).json(ride);
    } catch (err) {
      next(createError((err as Error).message, 400, 'START_FAILED'));
    }
  }
);

/**
 * POST /rides/:id/complete
 * Driver marks ride as completed.
 */
router.post(
  '/rides/:id/complete',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { user } = req as AuthenticatedRequest;
      const ride = await rideService.complete(req.params.id, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'ride.completed',
        entityType: 'ride',
        entityId: ride.id,
        ipAddress: req.ip,
      });

      getAcceptedRiderIds(ride.id).then(riderIds => {
        if (riderIds.length === 0) return;
        const dest = ride.destination_address.split(',')[0];
        pushService.sendToUsers(riderIds, 'Ride Complete! ⭐',
          `How was your ride to ${dest}? Tap to leave a rating.`,
          { rideId: ride.id, action: 'rate' }
        );
      });

      res.status(200).json(ride);
    } catch (err) {
      next(createError((err as Error).message, 400, 'COMPLETE_FAILED'));
    }
  }
);

/**
 * POST /rides/:id/cancel
 * Driver cancels a ride.
 */
router.post(
  '/rides/:id/cancel',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { user } = req as AuthenticatedRequest;
      const ride = await rideService.cancel(req.params.id, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'ride.cancelled',
        entityType: 'ride',
        entityId: ride.id,
        ipAddress: req.ip,
      });

      getAcceptedRiderIds(ride.id).then(riderIds => {
        if (riderIds.length === 0) return;
        const dest = ride.destination_address.split(',')[0];
        pushService.sendToUsers(riderIds, 'Ride Cancelled 😔',
          `Your ride to ${dest} has been cancelled by the driver.`,
          { rideId: ride.id }
        );
      });

      res.status(200).json(ride);
    } catch (err) {
      next(createError((err as Error).message, 400, 'CANCEL_FAILED'));
    }
  }
);

// ── Location ──────────────────────────────────────────────────────────

/**
 * POST /rides/:id/location
 * Driver pushes current GPS location.
 */
router.post(
  '/rides/:id/location',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { user } = req as AuthenticatedRequest;

      const body = parseBody(locationSchema, req.body, next);
      if (!body) return;

      const update = await locationService.upsert(
        req.params.id, user.id, body.lat, body.lng, body.heading
      );

      res.status(201).json(update);
    } catch (err) {
      next(createError((err as Error).message, 400, 'LOCATION_FAILED'));
    }
  }
);

/**
 * GET /rides/:id/location
 * Participants read the latest driver location.
 */
router.get(
  '/rides/:id/location',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { accessToken } = req as AuthenticatedRequest;
      const location = await locationService.getLatest(req.params.id, accessToken);
      res.status(200).json(location ?? { location: null });
    } catch (err) {
      next(err);
    }
  }
);

// ── Messages ──────────────────────────────────────────────────────────

/**
 * GET /rides/:id/messages
 * Participants read chat messages. Paginated.
 */
router.get(
  '/rides/:id/messages',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { accessToken } = req as AuthenticatedRequest;

      const query = parseQuery(messagesQuerySchema, req.query, next);
      if (!query) return;

      const result = await messageService.getForRide(req.params.id, accessToken, query.page);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /rides/:id/messages
 * Participant sends a message.
 */
router.post(
  '/rides/:id/messages',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!validateId(req.params.id, next)) return;
      const { user, accessToken } = req as AuthenticatedRequest;

      const body = parseBody(sendMessageSchema, req.body, next);
      if (!body) return;

      const message = await messageService.send(
        req.params.id, user.id, body.body, accessToken
      );

      auditService.logEvent({
        actorId: user.id,
        action: 'message.sent',
        entityType: 'message',
        entityId: message.id,
        metadata: { ride_id: req.params.id },
        ipAddress: req.ip,
      });

      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
