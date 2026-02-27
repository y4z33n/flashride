/**
 * Common Zod schemas reused across all routes.
 */

import { z } from 'zod';

/** Validates a UUID v4 path parameter. */
export const uuidParam = z.string().uuid({ message: 'Must be a valid UUID.' });

/** Validates a non-negative integer page number from a query string. */
export const pageQuery = z.coerce.number().int().min(0).default(0);

/** Validates a ride ID path parameter object. */
export const rideIdParams = z.object({
  id: uuidParam,
});

/** Common profile update fields. */
export const profileUpdateSchema = z.object({
  full_name:    z.string().min(2).max(100).optional(),
  phone:        z.string().min(7).max(20).optional(),
  avatar_url:   z.string().url().optional(),
  is_driver:    z.boolean().optional(),
  vehicle_info: z.string().max(200).optional(),
});

/** Create ride body schema — canonical, shared with rideService types. */
export const createRideSchema = z.object({
  origin_address:       z.string().min(3).max(300),
  origin_lat:           z.number().min(-90).max(90),
  origin_lng:           z.number().min(-180).max(180),
  destination_address:  z.string().min(3).max(300),
  destination_lat:      z.number().min(-90).max(90),
  destination_lng:      z.number().min(-180).max(180),
  departure_time:       z.string().datetime({ message: 'departure_time must be a valid ISO 8601 datetime.' }),
  seats_total:          z.number().int().min(1).max(8),
  price_per_seat:       z.number().min(0).nullable().optional(),
  notes:                z.string().max(500).nullable().optional(),
});

/** Search rides query params. */
export const searchRideSchema = z.object({
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD.' }),
  origin_lat:       z.coerce.number().min(-90).max(90).optional(),
  origin_lng:       z.coerce.number().min(-180).max(180).optional(),
  destination_lat:  z.coerce.number().min(-90).max(90).optional(),
  destination_lng:  z.coerce.number().min(-180).max(180).optional(),
  page:             pageQuery,
});

/** Claim seat body schema. */
export const claimSeatSchema = z.object({
  seats: z.number().int().min(1, { message: 'seats must be at least 1.' }).max(4, { message: 'seats cannot exceed 4.' }).default(1),
});

/** Send message body schema. */
export const sendMessageSchema = z.object({
  body: z.string().min(1, { message: 'Message cannot be empty.' }).max(1000, { message: 'Message cannot exceed 1000 characters.' }).trim(),
});

/** Location push body schema. */
export const locationSchema = z.object({
  lat:     z.number().min(-90).max(90),
  lng:     z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).nullable().optional(),
});

/** Messages query params. */
export const messagesQuerySchema = z.object({
  page: pageQuery,
});
