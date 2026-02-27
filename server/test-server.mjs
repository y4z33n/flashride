/**
 * Quick smoke test — run with: node test-server.mjs
 * Assumes server is running on http://localhost:3001
 */

const BASE = 'http://localhost:3001';

async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`✅  ${label}:`, JSON.stringify(result));
  } catch (err) {
    console.log(`❌  ${label}: ${err.message}`);
  }
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.message ?? body.error), { status: res.status, body });
  return { status: res.status, body };
}

async function run() {
  console.log('\n=== FlashRide Server Smoke Test ===\n');

  await test('GET /health → 200', () => getJson(`${BASE}/health`));
  await test('GET /version → 200', () => getJson(`${BASE}/version`));

  // /me without token should 401
  await test('GET /me (no token) → 401', async () => {
    const res = await fetch(`${BASE}/me`);
    const body = await res.json();
    if (res.status !== 401) throw new Error(`Expected 401 but got ${res.status}`);
    return { status: res.status, error: body.error };
  });

  // /me with fake token should 401
  await test('GET /me (fake token) → 401', async () => {
    const res = await fetch(`${BASE}/me`, {
      headers: { Authorization: 'Bearer this-is-not-a-real-token' },
    });
    const body = await res.json();
    if (res.status !== 401) throw new Error(`Expected 401 but got ${res.status}`);
    return { status: res.status, error: body.error };
  });

  // Non-existent route → 404
  await test('GET /nonexistent → 404', async () => {
    const res = await fetch(`${BASE}/nonexistent`);
    const body = await res.json();
    if (res.status !== 404) throw new Error(`Expected 404 but got ${res.status}`);
    return { status: res.status, error: body.error };
  });

  console.log('\n=== Done ===\n');
}

run();
