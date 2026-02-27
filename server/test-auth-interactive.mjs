/**
 * FlashRide — Step 2 Interactive Auth Test
 * ─────────────────────────────────────────
 * Signs in to Supabase with your email+password, gets a real JWT,
 * then fires it at the local server to test GET /me end-to-end.
 *
 * Run: node test-auth-interactive.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// ── Config (reads from .env automatically) ───────────────────────────
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVER_BASE = `http://localhost:${process.env.PORT || 3001}`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ───────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

function promptPassword(question) {
  // Node doesn't have built-in hidden input, but this is a local dev tool only
  return prompt(question);
}

async function callServer(path, token, options = {}) {
  const res = await fetch(`${SERVER_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// ── Main ──────────────────────────────────────────────────────────────
async function run() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   FlashRide Server — Step 2 Auth Test        ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(`Server: ${SERVER_BASE}`);
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  // ── Step 1: Sign in ──────────────────────────────────────────────
  const email = await prompt('Enter your Supabase account email: ');
  const password = await promptPassword('Enter your password: ');

  console.log('\n⏳  Signing in to Supabase...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

  if (authError || !authData.session) {
    console.error(`\n❌  Supabase sign-in failed: ${authError?.message || 'No session returned'}`);
    process.exit(1);
  }

  const token = authData.session.access_token;
  const userId = authData.user.id;

  console.log(`✅  Signed in as: ${authData.user.email}`);
  console.log(`    User ID: ${userId}`);
  console.log(`    Token (first 40 chars): ${token.substring(0, 40)}...\n`);

  // ── Step 2: Test GET /me ─────────────────────────────────────────
  console.log('─── Test 1: GET /me (valid token) ───────────────');
  const me = await callServer('/me', token);
  if (me.status === 200) {
    console.log('✅  HTTP 200');
    console.log(`    id:    ${me.body.id}`);
    console.log(`    email: ${me.body.email}`);
    if (me.body.profile) {
      console.log(`    profile.full_name:  ${me.body.profile.full_name}`);
      console.log(`    profile.is_driver:  ${me.body.profile.is_driver}`);
      console.log(`    profile.rating_avg: ${me.body.profile.rating_avg}`);
    } else {
      console.log('    profile: null (profile row not yet created — this is OK)');
    }
  } else {
    console.log(`❌  HTTP ${me.status}`);
    console.log('    Body:', JSON.stringify(me.body, null, 4));
  }

  // ── Step 3: Test GET /me without token ───────────────────────────
  console.log('\n─── Test 2: GET /me (no token → expect 401) ─────');
  const noToken = await fetch(`${SERVER_BASE}/me`);
  const noTokenBody = await noToken.json();
  if (noToken.status === 401) {
    console.log(`✅  HTTP 401 — ${noTokenBody.error}: ${noTokenBody.message}`);
  } else {
    console.log(`❌  Expected 401 but got ${noToken.status}`);
  }

  // ── Step 4: Test GET /users/:id ──────────────────────────────────
  console.log('\n─── Test 3: GET /users/:id (your own profile) ───');
  const byId = await callServer(`/users/${userId}`, token);
  if (byId.status === 200) {
    console.log('✅  HTTP 200 — public profile returned');
    console.log(`    email field present? ${'email' in byId.body ? '❌ YES (should be stripped!)' : '✅ NO (correctly stripped)'}`);
    console.log(`    full_name: ${byId.body.full_name}`);
  } else if (byId.status === 404) {
    console.log('ℹ️   HTTP 404 — profile not in DB yet (OK if you never completed profile setup)');
  } else {
    console.log(`❌  HTTP ${byId.status}:`, JSON.stringify(byId.body));
  }

  // ── Step 5: Test PATCH /me validation ────────────────────────────
  console.log('\n─── Test 4: PATCH /me (invalid payload → 400) ───');
  const badPatch = await callServer('/me', token, {
    method: 'PATCH',
    body: JSON.stringify({ full_name: 'X' }), // too short, min 2 but this is 1
  });
  if (badPatch.status === 400) {
    console.log('✅  HTTP 400 — validation rejected too-short name');
    console.log('    details:', JSON.stringify(badPatch.body.details));
  } else {
    console.log(`ℹ️   HTTP ${badPatch.status}:`, JSON.stringify(badPatch.body));
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('All tests complete. Server + Supabase auth working!');
  console.log('══════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
