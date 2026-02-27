/**
 * helpers/authMock.ts
 * ─────────────────────────────────────────────────────────────────────
 * Wires supabaseAdmin.auth.getUser to return a fake user so that
 * requireAuth middleware passes without a real Supabase JWT.
 *
 * Usage:
 *   mockAuthUser(supabaseMock.supabaseAdmin, { id: 'user-1', email: 'a@b.com' });
 *   const res = await request(app).get('/me').set(authHeader('token'));
 */

export const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@flashride.com',
};

export const TEST_USER_2 = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'test2@flashride.com',
};

export const ADMIN_SECRET = 'test-admin-secret-for-jest';

/** Returns Authorization header for supertest. */
export function authHeader(token = 'fake-jwt') {
  return { Authorization: `Bearer ${token}` };
}

/** Returns admin Authorization header. */
export function adminHeader() {
  return { Authorization: `Bearer ${ADMIN_SECRET}` };
}

/** Configures the mock supabase auth to approve a user. */
export function mockAuthUser(
  supabaseMock: { auth: { getUser: jest.Mock } },
  user = TEST_USER
) {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: user.id, email: user.email } },
    error: null,
  });
}

/** Configures the mock supabase auth to reject (expired token). */
export function mockAuthFail(supabaseMock: { auth: { getUser: jest.Mock } }) {
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'JWT expired' },
  });
}
