import { supabaseAdmin } from '../lib/supabase';
import type { Report, ReportReason } from '../types';

/**
 * reportService
 * ─────────────────────────────────────────────────────────────────────
 * Handles user reports with duplicate prevention and self-report guard.
 */
export const reportService = {

  async submit(
    reporterId: string,
    reportedUserId: string,
    reason: ReportReason,
    description?: string | null,
    rideId?: string | null
  ): Promise<Report> {

    // Cannot report yourself
    if (reporterId === reportedUserId) {
      const err = new Error('You cannot report yourself.') as Error & { code: string };
      err.code = 'SELF_REPORT';
      throw err;
    }

    // Duplicate check — same reporter + reported + reason within 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('reported_user_id', reportedUserId)
      .eq('reason', reason)
      .gte('created_at', since)
      .maybeSingle();

    if (existing) {
      const err = new Error('You have already submitted this report recently. Please wait 24 hours before reporting again.') as Error & { code: string };
      err.code = 'DUPLICATE_REPORT';
      throw err;
    }

    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        reason,
        description: description ?? null,
        ride_id: rideId ?? null,
        status: 'open',
      })
      .select('*, reporter:profiles!reporter_id(id, full_name), reported_user:profiles!reported_user_id(id, full_name)')
      .single();

    if (error) throw error;
    return report as Report;
  },
};
