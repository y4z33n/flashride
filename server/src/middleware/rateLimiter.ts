import rateLimit from 'express-rate-limit';

/**
 * Rate limiter configuration.
 * All limits are overridable via environment variables so Render / staging
 * environments can dial them differently without code changes.
 *
 * In test (NODE_ENV=test) all limiters are disabled — they would interfere
 * with Supertest because all requests come from the same loopback IP.
 */
const isTest = process.env.NODE_ENV === 'test';

function makeLimit(envKey: string, defaultMax: number) {
  const max = parseInt(process.env[envKey] ?? '', 10) || defaultMax;
  return isTest ? 100_000 : max;  // effectively unlimited in tests
}

/**
 * General limiter — applied to every route.
 * Default: 300 req / 15 min per IP.
 * Override: RATE_LIMIT_GENERAL (requests per window)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: makeLimit('RATE_LIMIT_GENERAL', 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * Strict limiter — write endpoints (POST/PATCH/PUT/DELETE) only.
 * Default: 60 req / 15 min per IP.
 * Override: RATE_LIMIT_STRICT
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: makeLimit('RATE_LIMIT_STRICT', 60),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Rate limit exceeded for this action. Please slow down.',
  },
});

/**
 * Auth limiter — login / OTP endpoints only.
 * Tightest limit: 10 req / 15 min per IP — brute-force protection.
 * Override: RATE_LIMIT_AUTH
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: makeLimit('RATE_LIMIT_AUTH', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many authentication attempts. Please wait 15 minutes.',
  },
});
