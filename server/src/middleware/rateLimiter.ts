import rateLimit from 'express-rate-limit';

/**
 * General rate limiter — applied to all routes.
 * 200 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * Strict rate limiter — applied to auth and write endpoints.
 * 30 requests per 15 minutes per IP.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded for this action. Please slow down.',
  },
});
