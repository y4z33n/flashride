/**
 * Server-side API client for the FlashRide admin panel.
 * All calls go through Next.js Server Components / Route Handlers,
 * so ADMIN_SECRET is never exposed to the browser.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

const adminHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${ADMIN_SECRET}`,
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...adminHeaders, ...options.headers },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────

export interface Stats {
  totals: { users: number; rides: number; reports: number; openReports: number };
  ridesByStatus: Record<string, number>;
  recentRides: RecentRide[];
}

export interface RecentRide {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  status: string;
  driver: { id: string; full_name: string } | null;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_driver: boolean;
  vehicle_info: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface UserDetail {
  profile: User;
  rides: RideRow[];
  requests: RequestRow[];
  ratings: RatingRow[];
  reports: ReportRow[];
}

export interface RideRow {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  status: string;
}

export interface RequestRow {
  id: string;
  status: string;
  ride: { origin_address: string; destination_address: string; departure_time: string } | null;
}

export interface RatingRow {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  rater: { full_name: string } | null;
}

export interface ReportRow {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { full_name: string } | null;
  reported_user?: { full_name: string } | null;
}

export interface Paginated<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

export interface ServerMetrics {
  startedAt: string;
  uptimeSeconds: number;
  requests: { total: number; byStatus: Record<string, number>; byMethod: Record<string, number> };
  errors: { total: number; by5xx: number; by4xx: number };
  auth: { successes: number; failures: number };
}

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

// ── API functions ─────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => apiFetch<Stats>('/admin/stats'),
  getMetrics: () => apiFetch<ServerMetrics>('/admin/metrics'),

  // Users
  listUsers: (page = 0, search?: string) => {
    const q = new URLSearchParams({ page: String(page) });
    if (search) q.set('search', search);
    return apiFetch<Paginated<User>>(`/admin/users?${q}`);
  },
  getUserDetail: (id: string) => apiFetch<UserDetail>(`/admin/users/${id}`),
  blockUser: (id: string, reason?: string) =>
    apiFetch<{ success: boolean }>(`/admin/users/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  unblockUser: (id: string) =>
    apiFetch<{ success: boolean }>(`/admin/users/${id}/unblock`, { method: 'POST' }),

  // Reports
  listReports: (page = 0, status?: string) => {
    const q = new URLSearchParams({ page: String(page) });
    if (status) q.set('status', status);
    return apiFetch<Paginated<ReportRow>>(`/admin/reports?${q}`);
  },
  updateReportStatus: (id: string, status: string) =>
    apiFetch<ReportRow>(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Rides
  listRides: (page = 0, status?: string) => {
    const q = new URLSearchParams({ page: String(page) });
    if (status) q.set('status', status);
    return apiFetch<Paginated<RideRow & { driver: { full_name: string; email: string } | null }>>(`/admin/rides?${q}`);
  },

  // Audit
  listAudit: (page = 0, action?: string) => {
    const q = new URLSearchParams({ page: String(page) });
    if (action) q.set('action', action);
    return apiFetch<Paginated<AuditEvent>>(`/admin/audit?${q}`);
  },
};
