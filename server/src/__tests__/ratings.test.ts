import request from 'supertest';
import { createApp } from '../app';
import { mockSupabase, setMockResponse } from './helpers/supabaseMock';
import { mockAuthUser, authHeader, TEST_USER, TEST_USER_2 } from './helpers/authMock';

jest.mock('../lib/supabase', () => require('./helpers/supabaseMock').mockSupabase);

const app = createApp();

const RIDE_ID   = 'aaaaaaaa-0000-0000-0000-000000000001';
const RATING_ID = 'bbbbbbbb-0000-0000-0000-000000000001';

const COMPLETED_RIDE = {
  id: RIDE_ID,
  driver_id: TEST_USER_2.id,
  status: 'completed',
};

const RATING = {
  id: RATING_ID,
  ride_id: RIDE_ID,
  rater_id: TEST_USER.id,
  rated_id: TEST_USER_2.id,
  score: 5,
  comment: 'Great driver!',
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  mockAuthUser(mockSupabase.supabaseAdmin);
});

describe('POST /rides/:id/rate', () => {
  it('returns 400 when score is out of range', async () => {
    const res = await request(app)
      .post(`/rides/${RIDE_ID}/rate`)
      .set(authHeader())
      .send({ rated_user_id: TEST_USER_2.id, score: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when rated_user_id is missing', async () => {
    const res = await request(app)
      .post(`/rides/${RIDE_ID}/rate`)
      .set(authHeader())
      .send({ score: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for non-UUID ride id', async () => {
    const res = await request(app)
      .post('/rides/bad-id/rate')
      .set(authHeader())
      .send({ rated_user_id: TEST_USER_2.id, score: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ID');
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post(`/rides/${RIDE_ID}/rate`)
      .send({ rated_user_id: TEST_USER_2.id, score: 5 });
    expect(res.status).toBe(401);
  });
});

describe('GET /rides/:id/ratings', () => {
  it('returns ratings list', async () => {
    setMockResponse({ data: [RATING], error: null });
    const res = await request(app)
      .get(`/rides/${RIDE_ID}/ratings`)
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 400 for non-UUID id', async () => {
    const res = await request(app).get('/rides/bad-id/ratings').set(authHeader());
    expect(res.status).toBe(400);
  });
});

describe('GET /users/:id/ratings', () => {
  it('returns ratings for a user', async () => {
    setMockResponse({ data: [RATING], error: null });
    const res = await request(app)
      .get(`/users/${TEST_USER_2.id}/ratings`)
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
