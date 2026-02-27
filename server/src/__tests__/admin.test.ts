import request from 'supertest';
import { createApp } from '../app';
import { mockSupabase, setMockResponse } from './helpers/supabaseMock';
import { mockAuthUser, adminHeader, TEST_USER } from './helpers/authMock';

jest.mock('../lib/supabase', () => require('./helpers/supabaseMock').mockSupabase);

const app = createApp();

const WRONG_HEADER = { Authorization: 'Bearer wrong-secret' };

const STATS_MOCK = {
  totals: { users: 10, rides: 5, reports: 2, openReports: 1 },
  ridesByStatus: { open: 3, completed: 2 },
  recentRides: [],
};

beforeEach(() => {
  mockAuthUser(mockSupabase.supabaseAdmin);
  // stats calls multiple queries — mock each as returning count
  setMockResponse({ data: [], error: null, count: 10 });
});

// ── Auth guard ────────────────────────────────────────────────────────

describe('Admin auth guard', () => {
  it('returns 401 when no secret provided', async () => {
    const res = await request(app).get('/admin/stats');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('returns 401 for wrong secret', async () => {
    const res = await request(app).get('/admin/stats').set(WRONG_HEADER);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('accepts the correct admin secret', async () => {
    const res = await request(app).get('/admin/stats').set(adminHeader());
    // 200 or 500 (if DB mocks don't match the stats multi-query exactly)
    // — the point is it's NOT 401 or 503
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(503);
  });
});

// ── /admin/metrics ────────────────────────────────────────────────────

describe('GET /admin/metrics', () => {
  it('returns 200 with metric fields', async () => {
    const res = await request(app).get('/admin/metrics').set(adminHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('requests');
    expect(res.body).toHaveProperty('errors');
    expect(res.body).toHaveProperty('auth');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });
});

// ── /admin/users ──────────────────────────────────────────────────────

describe('GET /admin/users', () => {
  it('returns user list', async () => {
    setMockResponse({ data: [{ id: TEST_USER.id, full_name: 'Test' }], error: null, count: 1 });
    const res = await request(app).get('/admin/users').set(adminHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('count');
  });

  it('returns 401 without secret', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.status).toBe(401);
  });
});

describe('GET /admin/users/:id', () => {
  it('returns 400 for non-UUID id', async () => {
    const res = await request(app).get('/admin/users/bad-id').set(adminHeader());
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ID');
  });
});

// ── /admin/reports ────────────────────────────────────────────────────

describe('GET /admin/reports', () => {
  it('returns report list', async () => {
    setMockResponse({ data: [], error: null, count: 0 });
    const res = await request(app).get('/admin/reports').set(adminHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('accepts status filter param', async () => {
    setMockResponse({ data: [], error: null, count: 0 });
    const res = await request(app)
      .get('/admin/reports')
      .query({ status: 'open' })
      .set(adminHeader());
    expect(res.status).toBe(200);
  });
});

describe('PATCH /admin/reports/:id', () => {
  const reportId = 'cccccccc-0000-0000-0000-000000000001';

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/admin/reports/${reportId}`)
      .set(adminHeader())
      .send({ status: 'not_a_real_status' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for non-UUID report id', async () => {
    const res = await request(app)
      .patch('/admin/reports/bad-id')
      .set(adminHeader())
      .send({ status: 'resolved' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ID');
  });

  it('returns 401 without secret', async () => {
    const res = await request(app)
      .patch(`/admin/reports/${reportId}`)
      .send({ status: 'resolved' });
    expect(res.status).toBe(401);
  });
});

// ── /admin/users block/unblock ────────────────────────────────────────

describe('POST /admin/users/:id/block', () => {
  it('returns 400 for non-UUID id', async () => {
    const res = await request(app)
      .post('/admin/users/bad-id/block')
      .set(adminHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without secret', async () => {
    const res = await request(app)
      .post(`/admin/users/${TEST_USER.id}/block`)
      .send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /admin/users/:id/unblock', () => {
  it('returns 401 without secret', async () => {
    const res = await request(app)
      .post(`/admin/users/${TEST_USER.id}/unblock`);
    expect(res.status).toBe(401);
  });
});

// ── /admin/rides + /admin/audit ───────────────────────────────────────

describe('GET /admin/rides', () => {
  it('returns ride list', async () => {
    setMockResponse({ data: [], error: null, count: 0 });
    const res = await request(app).get('/admin/rides').set(adminHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});

describe('GET /admin/audit', () => {
  it('returns audit event list', async () => {
    setMockResponse({ data: [], error: null, count: 0 });
    const res = await request(app).get('/admin/audit').set(adminHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});
