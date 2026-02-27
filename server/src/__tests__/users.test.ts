import request from 'supertest';
import { createApp } from '../app';
import { mockSupabase, setMockResponse } from './helpers/supabaseMock';
import { mockAuthUser, authHeader, TEST_USER } from './helpers/authMock';

jest.mock('../lib/supabase', () => require('./helpers/supabaseMock').mockSupabase);

const app = createApp();

const PROFILE = {
  id: TEST_USER.id,
  full_name: 'Test User',
  email: TEST_USER.email,
  phone: null,
  avatar_url: null,
  is_driver: false,
  rating_avg: 0,
  rating_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  mockAuthUser(mockSupabase.supabaseAdmin);
  setMockResponse({ data: PROFILE, error: null });
});

describe('GET /me', () => {
  it('returns the authenticated user profile', async () => {
    const res = await request(app).get('/me').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_USER.id);
    expect(res.body.email).toBe(TEST_USER.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /users/:id', () => {
  it('returns a profile for a valid UUID', async () => {
    const res = await request(app)
      .get(`/users/${TEST_USER.id}`)
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_USER.id);
    // Email should NOT appear on public profile
    expect(res.body.email).toBeUndefined();
  });

  it('returns 400 for a non-UUID id', async () => {
    const res = await request(app).get('/users/not-a-uuid').set(authHeader());
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ID');
  });

  it('returns 404 when profile does not exist', async () => {
    setMockResponse({ data: null, error: null });
    const res = await request(app)
      .get(`/users/00000000-0000-0000-0000-000000000099`)
      .set(authHeader());
    expect(res.status).toBe(404);
  });
});

describe('PATCH /me', () => {
  it('updates the profile and returns 200', async () => {
    setMockResponse({ data: { ...PROFILE, full_name: 'Updated Name' }, error: null });
    const res = await request(app)
      .patch('/me')
      .set(authHeader())
      .send({ full_name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('Updated Name');
  });

  it('returns 400 for invalid body fields', async () => {
    const res = await request(app)
      .patch('/me')
      .set(authHeader())
      .send({ full_name: '' }); // empty string should fail validation
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
