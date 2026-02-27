import 'dotenv/config';

/**
 * Reads a required environment variable.
 * Throws at startup if it's missing or empty — fail fast, never silently.
 */
function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[config] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optional(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const config = {
  supabase: {
    url: required('SUPABASE_URL'),
    anonKey: required('SUPABASE_ANON_KEY'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },
  server: {
    port: parseInt(optional('PORT', '3001'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
    isDev: optional('NODE_ENV', 'development') === 'development',
    isProd: optional('NODE_ENV', 'development') === 'production',
  },
  cors: {
    // Split comma-separated origins into an array
    origins: optional('CORS_ORIGINS', 'http://localhost:8081,http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  app: {
    version: optional('APP_VERSION', '1.0.0'),
  },
} as const;
