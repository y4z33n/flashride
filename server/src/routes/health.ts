import { Router, Request, Response } from 'express';
import { config } from '../config';
import { getMetricsSnapshot } from '../lib/metrics';

const router = Router();

/**
 * GET /health
 * Used by Render, load balancers, and monitoring tools.
 * Returns 200 — never requires auth.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /version
 * Returns the deployed version. Confirms which build is live.
 */
router.get('/version', (_req: Request, res: Response) => {
  res.status(200).json({
    version: config.app.version,
    nodeEnv: config.server.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /metrics
 * In-memory request/error counters.
 * ⚠️  In production, protect this behind admin auth (Step 12).
 * For now it's open — only useful internally, no sensitive data exposed.
 */
router.get('/metrics', (_req: Request, res: Response) => {
  res.status(200).json(getMetricsSnapshot());
});

export default router;
