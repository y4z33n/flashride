/**
 * Step 2 — Real JWT end-to-end test
 * ──────────────────────────────────
 * How to get a real token:
 *   1. Open your Supabase dashboard
 *   2. Go to Authentication → Users
 *   3. Click any user → "Send magic link" OR
 *   4. Better: grab the session token from the mobile app's SecureStore, OR
 *   5. Use the Supabase JS client directly (see below)
 *
 * Quickest way — paste your token as the TOKEN variable below and run:
 *   node test-auth.mjs
 */

const BASE = 'http://localhost:3001';

// ─── PASTE YOUR TOKEN HERE ────────────────────────────────────────────
// Get it from: Supabase Dashboard → Authentication → Users → user row
// → click "..." → "Generate link" won't work; instead use the approach below.
//
// QUICKEST: In your mobile app, add a temporary console.log in auth.ts:
//   const session = await supabase.auth.getSession();
//   console.log(session.data.session?.access_token);
// Then copy that value here.
const TOKEN = process.env.TEST_TOKEN || '';
// ─────────────────────────────────────────────────────────────────────

if (!TOKEN) {
  console.error('\n❌  No token provided.');
  console.error('    Set TEST_TOKEN env var or paste it into this file.\n');
  console.error('    Example:');
  console.error('    $env:TEST_TOKEN="eyJ..."; node test-auth.mjs\n');
  process.exit(1);
}

async function run() {
  console.log('\n=== Step 2 Real JWT Test ===\n');

  const res = await fetch(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  const body = await res.json();

  if (res.status === 200) {
    console.log('✅  GET /me → 200');
    console.log('    Auth identity:', { id: body.id, email: body.email });
    console.log('    Profile:', body.profile ? JSON.stringify(body.profile, null, 4) : '(null — profile not yet created)');
  } else {
    console.log(`❌  GET /me → ${res.status}`);
    console.log('    Body:', JSON.stringify(body, null, 4));
  }
}

run().catch(console.error);
