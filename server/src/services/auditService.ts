import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { AuditAction, AuditEntityType } from '../types';

interface AuditParams {
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * auditService
 * ─────────────────────────────────────────────────────────────────────
 * Writes to the audit_events table using the service role (bypasses RLS).
 * Every important state-change in the app should call logEvent().
 *
 * Design decisions:
 *  - Fire-and-forget: audit failures never block the main operation.
 *  - Errors are logged server-side but not thrown.
 *  - actorId can be null for system-initiated events.
 */
export const auditService = {
  async logEvent(params: AuditParams): Promise<void> {
    const { error } = await supabaseAdmin.from('audit_events').insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
    });

    if (error) {
      // Log the failure but never throw — audit must not block core operations
      logger.error('Failed to write audit event', {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        supabaseError: error.message,
      });
    }
  },
};
