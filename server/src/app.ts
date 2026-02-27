import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/logger';
import { metricsMiddleware } from './middleware/metrics';
import { generalLimiter, strictLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import usersRouter from './routes/users';
import requestsRouter from './routes/requests';
import ridesRouter from './routes/rides';
import ratingsRouter from './routes/ratings';
import adminRouter from './routes/admin';

export function createApp() {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────
  // helmet() sets safe defaults; we override a few for a JSON-only API.
  app.use(
    helmet({
      // API serves JSON only — no browser rendering, so no CSP needed
      contentSecurityPolicy: false,
      // Force HTTPS for 1 year (Render provides TLS termination)
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
      // Prevent MIME sniffing
      noSniff: true,
      // X-Frame-Options not needed for a pure JSON API
      frameguard: false,
      // Referrer leakage is irrelevant for a JSON API
      referrerPolicy: { policy: 'no-referrer' },
    })
  );
  // Belt-and-suspenders: hide the framework identifier
  app.disable('x-powered-by');

  // ── CORS ──────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (curl, Postman, React Native mobile)
        if (!origin) return callback(null, true);
        if (config.cors.origins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // ── Request ID (before logger so it appears in every log line) ────────
  app.use(requestId);

  // ── Request logging ───────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Metrics (hooks on response finish) ───────────────────────────────
  app.use(metricsMiddleware);

  // ── Body parsing ──────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Rate limiting ─────────────────────────────────────────────────────
  // General: every route
  app.use(generalLimiter);
  // Auth: brute-force protection on auth-adjacent paths
  app.use('/auth', authLimiter);
  // Strict: all write methods
  app.use((req, res, next) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return strictLimiter(req, res, next);
    }
    next();
  });

  // ── Routes ────────────────────────────────────────────────────────────
  app.use('/', healthRouter);
  app.use('/', usersRouter);
  app.use('/', ridesRouter);
  app.use('/', requestsRouter);
  app.use('/', ratingsRouter);
  app.use('/', adminRouter);

  // ── 404 handler ───────────────────────────────────────────────────────
  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Not Found', message: 'This endpoint does not exist.' });
  });

  // ── Central error handler (MUST be last) ─────────────────────────────
  app.use(errorHandler);

  return app;
}