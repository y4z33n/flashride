/**
 * Admin smoke test — run with: node test-admin.mjs
 * Assumes server is running on http://localhost:3001
 */

const BASE = 'http://localhost:3001';
const SECRET = '84b9c89d2930025d31657f8e6d14971ae21311bcf8a65761e8a3a7cd11306975';

async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✅  ${label}`, JSON.stringify(result).slice(0, 120));
  } catch (err) {
    console.error(`  ❌  ${label}`, err.message);
  }
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  return { status: res.status, body };
}

const adminHeaders = { Authorization: `Bearer ${SECRET}` };

async function run() {
  console.log('\n=== Admin Panel Smoke Test ===\n');

  await test('GET /admin/stats (valid secret) → 200', () =>
    get('/admin/stats', adminHeaders).then(r => ({ status: r.status, totals: r.body.totals }))
  );

  await test('GET /admin/metrics (valid secret) → 200', () =>
    get('/admin/metrics', adminHeaders).then(r => ({ status: r.status, uptime: r.body.uptimeSeconds }))
  );

  await test('GET /admin/users (valid secret) → 200', () =>
    get('/admin/users', adminHeaders).then(r => ({ status: r.status, count: r.body.count }))
  );

  await test('GET /admin/reports (valid secret) → 200', () =>
    get('/admin/reports', adminHeaders).then(r => ({ status: r.status, count: r.body.count }))
  );

  await test('GET /admin/rides (valid secret) → 200', () =>
    get('/admin/rides', adminHeaders).then(r => ({ status: r.status, count: r.body.count }))
  );

  await test('GET /admin/audit (valid secret) → 200', () =>
    get('/admin/audit', adminHeaders).then(r => ({ status: r.status, count: r.body.count }))
  );

  await test('GET /admin/stats (no secret) → 401', async () => {
    const res = await fetch(`${BASE}/admin/stats`);
    const body = await res.json();
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return { status: res.status, error: body.error };
  });

  await test('GET /admin/stats (wrong secret) → 401', async () => {
    const res = await fetch(`${BASE}/admin/stats`, { headers: { Authorization: 'Bearer wrong' } });
    const body = await res.json();
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return { status: res.status, error: body.error };
  });

  console.log('\n=== Done ===\n');
}

run();
