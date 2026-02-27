import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { strictLimiter } from '../middleware/rateLimiter';
import { createError } from '../middleware/errorHandler';
import { rideService } from '../services/rideService';
import { messageService } from '../services/messageService';
import { locationService } from '../services/locationService';
import { auditService } from '../services/auditService';
import { pushService } from '../services/pushService';
import { supabaseAdmin } from '../lib/supabase';

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

// ── Validation schemas ────────────────────────────────────────────────

const createRideSchema = z.object({
  origin_address:       z.string().min(3).max(300),
  origin_lat:           z.number().min(-90).max(90),
  origin_lng:           z.number().min(-180).max(180),
  destination_address:  z.string().min(3).max(300),
  destination_lat:      z.number().min(-90).max(90),
  destination_lng:      z.number().min(-180).max(180),
  departure_time:       z.string().datetime({ message: 'departure_time must be a valid ISO 8601 datetime' }),
  seats_total:          z.number().int().min(1).max(8),
  price_per_seat:       z.number().min(0).nullable().optional(),
  notes:                z.string().max(500).nullable().optional(),
});

const searchRideSchema = z.object({
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  origin_lat:       z.coerce.number().min(-90).max(90).optional(),
  origin_lng:       z.coerce.number().min(-180).max(180).optional(),
  destination_lat:  z.coerce.number().min(-90).max(90).optional(),
  destination_lng:  z.coerce.number().min(-180).max(180).optional(),
  page:             z.coerce.number().int().min(0).default(0),
});

const sendMessageSchema = z.object({
  body: z.string().min(1).max(1000),
});

const locationSchema = z.object({
  lat:     z.number().min(-90).max(90),
  lng:     z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).nullable().optional(),
});

// ── Rides CRUD ────────────────────────────────────────────────────────

/**
 * POST /rides
 * Offer a new ride. driver_id is taken from JWT — never from body.
 */
router.post(
  '/rides',
  requireAuth,
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;

      const parsed = createRideSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(createError('Validation failed.', 400, 'VALIDATION_ERROR'));
      }

      // Departure time must be in the future
      if (new Date(parsed.data.departure_time) <= new Date()) {
        return next(createError('departure_time must be in the future.', 400, 'INVALID_DEPARTURE_TIME'));
      }

      const ride = await rideService.create(user.id, parsed.data);

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
 * Search available rides by date (and optionally coordinates).
 */
router.get(
  '/rides/search',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = searchRideSchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters.',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const result = await rideService.search(parsed.data);
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
      const { accessToken } = req as AuthenticatedRequest;
      const ride = await rideService.getById(req.params.id, accessToken);

      if (!ride) {
        return next(createError('Ride not found.', 404, 'NOT_FOUND'));
      }

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
      const { user } = req as AuthenticatedRequest;
      const ride = await rideService.start(req.params.id, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'ride.created',
        entityType: 'ride',
        entityId: ride.id,
        metadata: { status: 'in_progress' },
        ipAddress: req.ip,
      });

      // Notify all accepted riders the ride has started (fire-and-forget)
      getAcceptedRiderIds(ride.id).then(riderIds => {
        if (riderIds.length === 0) return;
        const dest = ride.destination_address.split(',')[0];
        pushService.sendToUsers(
          riderIds,
          'Your Ride Has Started 🚗',
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
      const { user } = req as AuthenticatedRequest;
      const ride = await rideService.complete(req.params.id, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'ride.completed',
        entityType: 'ride',
        entityId: ride.id,
        ipAddress: req.ip,
      });

      // Prompt all riders to leave a rating (fire-and-forget)
      getAcceptedRiderIds(ride.id).then(riderIds => {
        if (riderIds.length === 0) return;
        const dest = ride.destination_address.split(',')[0];
        pushService.sendToUsers(
          riderIds,
          'Ride Complete! ⭐',
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
      const { user } = req as AuthenticatedRequest;
      const ride = await rideService.cancel(req.params.id, user.id);

      auditService.logEvent({
        actorId: user.id,
        action: 'ride.cancelled',
        entityType: 'ride',
        entityId: ride.id,
        ipAddress: req.ip,
      });

      // Notify all accepted riders the ride was cancelled (fire-and-forget)
      getAcceptedRiderIds(ride.id).then(riderIds => {
        if (riderIds.length === 0) return;
        const dest = ride.destination_address.split(',')[0];
        pushService.sendToUsers(
          riderIds,
          'Ride Cancelled 😔',
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
      const { user } = req as AuthenticatedRequest;

      const parsed = locationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const update = await locationService.upsert(
        req.params.id,
        user.id,
        parsed.data.lat,
        parsed.data.lng,
        parsed.data.heading
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
      const { accessToken } = req as AuthenticatedRequest;
      const location = await locationService.getLatest(req.params.id, accessToken);

      if (!location) {
        res.status(200).json({ location: null });
        return;
      }

      res.status(200).json(location);
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
      const { accessToken } = req as AuthenticatedRequest;
      const page = parseInt(String(req.query.page ?? '0'), 10);

      const result = await messageService.getForRide(req.params.id, accessToken, page);
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
      const { user, accessToken } = req as AuthenticatedRequest;

      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const message = await messageService.send(
        req.params.id,
        user.id,
        parsed.data.body,
        accessToken
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
