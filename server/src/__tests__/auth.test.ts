/**
 * Tests for requireAuth middleware via the /me endpoint.
 * Supabase is fully mocked — no network calls.
 */
import request from 'supertest';
import { createApp } from '../app';
import { mockSupabase, setMockResponse } from './helpers/supabaseMock';
import { mockAuthUser, mockAuthFail, TEST_USER } from './helpers/authMock';

jest.mock('../lib/supabase', () => require('./helpers/supabaseMock').mockSupabase);

const app = createApp();

describe('requireAuth middleware', () => {
  beforeEach(() => {
    mockAuthUser(mockSupabase.supabaseAdmin);
    setMockResponse({ data: { id: TEST_USER.id, full_name: 'Test User', email: TEST_USER.email }, error: null });
  });

  it('returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header has wrong format', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid / expired', async () => {
    mockAuthFail(mockSupabase.supabaseAdmin);
    const res = await request(app).get('/me').set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('passes with a valid token and returns user data', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_USER.id);
    expect(res.body.email).toBe(TEST_USER.email);
  });
});
