import request from 'supertest';
import { createApp } from '../app';
import { mockSupabase, setMockResponse } from './helpers/supabaseMock';
import { mockAuthUser, authHeader, TEST_USER } from './helpers/authMock';

jest.mock('../lib/supabase', () => require('./helpers/supabaseMock').mockSupabase);

const app = createApp();

const RIDE = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  driver_id: TEST_USER.id,
  origin_address: 'Quatre Bornes, Mauritius',
  origin_lat: -20.26,
  origin_lng: 57.48,
  destination_address: 'Port Louis, Mauritius',
  destination_lat: -20.16,
  destination_lng: 57.49,
  departure_time: new Date(Date.now() + 3_600_000).toISOString(), // 1h from now
  seats_total: 3,
  seats_available: 3,
  price_per_seat: 50,
  notes: null,
  status: 'open',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const VALID_RIDE_BODY = {
  origin_address:      'Quatre Bornes, Mauritius',
  origin_lat:          -20.26,
  origin_lng:          57.48,
  destination_address: 'Port Louis, Mauritius',
  destination_lat:     -20.16,
  destination_lng:     57.49,
  departure_time:      new Date(Date.now() + 3_600_000).toISOString(),
  seats_total:         3,
  price_per_seat:      50,
};

beforeEach(() => {
  mockAuthUser(mockSupabase.supabaseAdmin);
  setMockResponse({ data: RIDE, error: null });
});

describe('POST /rides', () => {
  it('creates a ride and returns 201', async () => {
    const res = await request(app)
      .post('/rides')
      .set(authHeader())
      .send(VALID_RIDE_BODY);
    expect(res.status).toBe(201);
    expect(res.body.driver_id).toBe(TEST_USER.id);
    expect(res.body.origin_address).toBe(VALID_RIDE_BODY.origin_address);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/rides').send(VALID_RIDE_BODY);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/rides')
      .set(authHeader())
      .send({ origin_address: 'Only this field' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when departure_time is in the past', async () => {
    const res = await request(app)
      .post('/rides')
      .set(authHeader())
      .send({ ...VALID_RIDE_BODY, departure_time: new Date(Date.now() - 1000).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_DEPARTURE_TIME');
  });

  it('returns 400 when seats_total is out of range', async () => {
    const res = await request(app)
      .post('/rides')
      .set(authHeader())
      .send({ ...VALID_RIDE_BODY, seats_total: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('GET /rides/search', () => {
  it('returns 200 with search results', async () => {
    setMockResponse({ data: [RIDE], error: null, count: 1 });
    const res = await request(app)
      .get('/rides/search')
      .set(authHeader())
      .query({ date: new Date().toISOString().slice(0, 10), origin_lat: -20.26, origin_lng: 57.48 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/rides/search')
      .query({ date: new Date().toISOString().slice(0, 10) });
    expect(res.status).toBe(401);
  });
});

describe('GET /rides/:id', () => {
  it('returns a ride for a valid UUID', async () => {
    const res = await request(app).get(`/rides/${RIDE.id}`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(RIDE.id);
  });

  it('returns 400 for non-UUID id', async () => {
    const res = await request(app).get('/rides/not-a-uuid').set(authHeader());
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ID');
  });

  it('returns 404 when ride does not exist', async () => {
    setMockResponse({ data: null, error: null });
    const res = await request(app)
      .get('/rides/00000000-0000-0000-0000-000000000099')
      .set(authHeader());
    expect(res.status).toBe(404);
  });
});
