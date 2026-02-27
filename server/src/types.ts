// Shared TypeScript types mirrored from the mobile app's lib/types.ts
// Keep these in sync when the DB schema changes.

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_driver: boolean;
  vehicle_info: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export type RideStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  driver_id: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  price_per_seat: number | null;
  notes: string | null;
  status: RideStatus;
  created_at: string;
  updated_at: string;
  driver?: Profile;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface RideRequest {
  id: string;
  ride_id: string;
  rider_id: string;
  seats_requested: number;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  rider?: Profile;
  ride?: Ride;
}

export interface Message {
  id: string;
  ride_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Profile;
}

export interface LocationUpdate {
  id: string;
  ride_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  created_at: string;
}

// ── Audit ─────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export type AuditAction =
  | 'ride.created'   | 'ride.cancelled'  | 'ride.completed'
  | 'request.created'| 'request.accepted'| 'request.rejected' | 'request.cancelled'
  | 'user.blocked'   | 'user.unblocked'
  | 'report.created' | 'report.status_changed'
  | 'message.sent'
  | 'admin.login';

export type AuditEntityType = 'ride' | 'request' | 'user' | 'report' | 'message' | 'session';

// ── Reports ───────────────────────────────────────────────────────────

export type ReportReason =
  | 'unsafe_driving'
  | 'harassment'
  | 'no_show'
  | 'fraud'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  ride_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  reporter?: Profile;
  reported_user?: Profile;
}

// ── Blocked Users ─────────────────────────────────────────────────────

export interface BlockedUser {
  id: string;
  user_id: string;
  blocked_by: string | null;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
