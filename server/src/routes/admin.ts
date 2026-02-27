import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { createError, parseBody, parseQuery } from '../middleware/errorHandler';
import { adminService } from '../services/adminService';
import { auditService } from '../services/auditService';
import { getMetricsSnapshot } from '../lib/metrics';
import {
  updateReportStatusSchema,
  blockUserSchema,
  adminListQuerySchema,
  uuidParam,
} from '../lib/schemas';
import type { ReportStatus } from '../types';

const router = Router();

// All /admin/* routes require the admin secret
router.use('/admin', requireAdmin);

/** Validate a UUID path param — returns false and calls next(400) if invalid. */
function validateId(id: string, next: NextFunction): boolean {
  if (!uuidParam.safeParse(id).success) {
    next(createError('Invalid ID — must be a valid UUID.', 400, 'INVALID_ID'));
    return false;
  }
  return true;
}

// ── Dashboard ─────────────────────────────────────────────────────────

/**
 * GET /admin/stats
 * Overview counts: users, rides, open reports + rides by status.
 */
router.get('/admin/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getStats();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/metrics
 * In-memory server metrics (requests, errors, auth counts).
 * Moved here from /metrics so it's protected in production.
 */
router.get('/admin/metrics', (_req: Request, res: Response) => {
  res.status(200).json(getMetricsSnapshot());
});

// ── Users ─────────────────────────────────────────────────────────────

/**
 * GET /admin/users
 * Paginated user list. Supports ?search=name&page=0
 */
router.get('/admin/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseQuery(adminListQuerySchema, req.query, next);
    if (!query) return;

    const result = await adminService.listUsers(query.page, query.search);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/users/:id
 * Full user detail: profile + rides + requests + ratings + reports.
 */
router.get('/admin/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validateId(req.params.id, next)) return;
    const detail = await adminService.getUserDetail(req.params.id);
    res.status(200).json(detail);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/users/:id/block
 * Block a user. Sets blocked_users.is_active = true.
 * Body: { reason?: string }
 */
router.post('/admin/users/:id/block', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validateId(req.params.id, next)) return;

    const body = parseBody(blockUserSchema, req.body, next);
    if (!body) return;

    await adminService.blockUser(req.params.id, body.reason ?? null, req.ip ?? null);

    auditService.logEvent({
      actorId: null,
      action: 'user.blocked',
      entityType: 'user',
      entityId: req.params.id,
      metadata: { reason: body.reason ?? null },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'User blocked.' });
  } catch (err: any) {
    if (err.code === 'ALREADY_BLOCKED') return next(createError(err.message, 409, err.code));
    next(err);
  }
});

/**
 * POST /admin/users/:id/unblock
 * Unblock a user. Sets blocked_users.is_active = false.
 */
router.post('/admin/users/:id/unblock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validateId(req.params.id, next)) return;

    await adminService.unblockUser(req.params.id);

    auditService.logEvent({
      actorId: null,
      action: 'user.unblocked',
      entityType: 'user',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'User unblocked.' });
  } catch (err: any) {
    if (err.code === 'NOT_BLOCKED') return next(createError(err.message, 409, err.code));
    next(err);
  }
});

// ── Reports ───────────────────────────────────────────────────────────

/**
 * GET /admin/reports
 * Paginated report list. Supports ?status=open&page=0
 */
router.get('/admin/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseQuery(adminListQuerySchema, req.query, next);
    if (!query) return;

    const result = await adminService.listReports(
      query.page,
      query.status as ReportStatus | undefined
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/reports/:id
 * Update a report's status. Body: { status: 'open'|'in_review'|'resolved'|'dismissed' }
 */
router.patch('/admin/reports/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validateId(req.params.id, next)) return;

    const body = parseBody(updateReportStatusSchema, req.body, next);
    if (!body) return;

    const report = await adminService.updateReportStatus(
      req.params.id,
      body.status as ReportStatus,
      null  // admin actor — no user ID
    );

    auditService.logEvent({
      actorId: null,
      action: 'report.status_changed',
      entityType: 'report',
      entityId: req.params.id,
      metadata: { new_status: body.status },
      ipAddress: req.ip,
    });

    res.status(200).json(report);
  } catch (err) {
    next(err);
  }
});

// ── Rides ─────────────────────────────────────────────────────────────

/**
 * GET /admin/rides
 * Paginated ride list. Supports ?status=open&page=0
 */
router.get('/admin/rides', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseQuery(adminListQuerySchema, req.query, next);
    if (!query) return;

    const result = await adminService.listRides(query.page, query.status);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ── Audit log ─────────────────────────────────────────────────────────

/**
 * GET /admin/audit
 * Paginated audit event log. Supports ?action=ride.created&page=0
 */
router.get('/admin/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseQuery(adminListQuerySchema, req.query, next);
    if (!query) return;

    const result = await adminService.listAuditEvents(query.page, query.action);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
