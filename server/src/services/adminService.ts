import { supabaseAdmin } from '../lib/supabase';
import type { Report, ReportStatus, Profile, BlockedUser, AuditEvent } from '../types';

const PAGE_SIZE = 25;

/**
 * adminService
 * ─────────────────────────────────────────────────────────────────────
 * All read/write operations for the admin panel.
 * Always uses supabaseAdmin (service role) — bypasses RLS by design.
 */
export const adminService = {

  // ── Dashboard stats ───────────────────────────────────────────────

  async getStats() {
    const [users, rides, reports, openReports] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('rides').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    const [ridesByStatus, recentRides] = await Promise.all([
      supabaseAdmin.from('rides').select('status'),
      supabaseAdmin
        .from('rides')
        .select('id, origin_address, destination_address, departure_time, status, driver:profiles!driver_id(id, full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const statusCounts = (ridesByStatus.data ?? []).reduce((acc: Record<string, number>, r: { status: string }) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totals: {
        users: users.count ?? 0,
        rides: rides.count ?? 0,
        reports: reports.count ?? 0,
        openReports: openReports.count ?? 0,
      },
      ridesByStatus: statusCounts,
      recentRides: recentRides.data ?? [],
    };
  },

  // ── User management ───────────────────────────────────────────────

  async listUsers(page = 0, search?: string) {
    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []) as Profile[], count: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE_SIZE };
  },

  async getUserDetail(userId: string) {
    const [profile, rides, requests, ratings, reports] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
      supabaseAdmin.from('rides').select('id, origin_address, destination_address, departure_time, status').eq('driver_id', userId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('ride_requests').select('id, status, ride:rides(origin_address, destination_address, departure_time)').eq('rider_id', userId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('ratings').select('id, score, comment, created_at, rater:profiles!rater_id(full_name)').eq('rated_id', userId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('reports').select('id, reason, status, created_at, reporter:profiles!reporter_id(full_name)').eq('reported_user_id', userId).order('created_at', { ascending: false }).limit(10),
    ]);

    if (profile.error) throw profile.error;
    return {
      profile: profile.data as Profile,
      rides: rides.data ?? [],
      requests: requests.data ?? [],
      ratings: ratings.data ?? [],
      reports: reports.data ?? [],
    };
  },

  async blockUser(userId: string, reason: string | null, adminIp: string | null) {
    // Check if already blocked
    const { data: existing } = await supabaseAdmin
      .from('blocked_users')
      .select('id, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.is_active) {
      const err = new Error('User is already blocked.') as Error & { code: string };
      err.code = 'ALREADY_BLOCKED';
      throw err;
    }

    if (existing) {
      // Re-activate existing blocked_user row
      const { error } = await supabaseAdmin
        .from('blocked_users')
        .update({ is_active: true, reason, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('blocked_users')
        .insert({ user_id: userId, reason, is_active: true, blocked_by: null });
      if (error) throw error;
    }

    return { success: true };
  },

  async unblockUser(userId: string) {
    const { data: existing } = await supabaseAdmin
      .from('blocked_users')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!existing) {
      const err = new Error('User is not currently blocked.') as Error & { code: string };
      err.code = 'NOT_BLOCKED';
      throw err;
    }

    const { error } = await supabaseAdmin
      .from('blocked_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) throw error;
    return { success: true };
  },

  // ── Reports ───────────────────────────────────────────────────────

  async listReports(page = 0, status?: ReportStatus) {
    let query = supabaseAdmin
      .from('reports')
      .select(
        'id, reason, description, status, created_at, ride_id, ' +
        'reporter:profiles!reporter_id(id, full_name, email), ' +
        'reported_user:profiles!reported_user_id(id, full_name, email)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []) as unknown as Report[], count: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE_SIZE };
  },

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    resolvedBy: string | null
  ): Promise<Report> {
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'resolved' || status === 'dismissed') {
      update.resolved_by = resolvedBy;
      update.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('reports')
      .update(update)
      .eq('id', reportId)
      .select('*, reporter:profiles!reporter_id(id, full_name), reported_user:profiles!reported_user_id(id, full_name)')
      .single();

    if (error) throw error;
    return data as Report;
  },

  // ── Rides ─────────────────────────────────────────────────────────

  async listRides(page = 0, status?: string) {
    let query = supabaseAdmin
      .from('rides')
      .select(
        'id, origin_address, destination_address, departure_time, status, ' +
        'seats_total, seats_available, created_at, ' +
        'driver:profiles!driver_id(id, full_name, email)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE_SIZE };
  },

  // ── Audit log ─────────────────────────────────────────────────────

  async listAuditEvents(page = 0, action?: string) {
    let query = supabaseAdmin
      .from('audit_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (action) query = query.eq('action', action);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data ?? []) as AuditEvent[], count: count ?? 0, hasMore: (count ?? 0) > (page + 1) * PAGE_SIZE };
  },
};
