import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

/**
 * GET /health
 * Used by Render, load balancers, and monitoring tools.
 * Never requires auth.
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

export default router;
