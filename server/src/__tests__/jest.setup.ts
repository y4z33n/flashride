/**
 * jest.setup.ts
 * Sets minimum required environment variables before any test module loads.
 * This prevents config.ts from throwing on startup.
 *
 * The env-var block runs via `setupFiles` (before framework).
 * The `beforeEach` block runs via `setupFilesAfterEnv` (after framework).
 */
process.env.SUPABASE_URL              = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY         = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.ADMIN_SECRET              = 'test-admin-secret-for-jest';
process.env.NODE_ENV                  = 'test';
process.env.PORT                      = '0';
process.env.CORS_ORIGINS              = 'http://localhost:3000';

// Reset shared mock response before each test to prevent cross-file bleed
// `beforeEach` is available here because this file is also listed in setupFilesAfterEnv
if (typeof beforeEach !== 'undefined') {
  beforeEach(() => {
    try {
      const { resetMockResponse } = require('./helpers/supabaseMock');
      resetMockResponse();
    } catch {
      // supabaseMock not loaded in this test (e.g. health.test.ts) — ignore
    }
  });
}
