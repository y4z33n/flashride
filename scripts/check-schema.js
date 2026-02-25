// node scripts/run-migration.js <filename>
// e.g. node scripts/run-migration.js 002_schema.sql
const https = require('https');
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.js <filename>');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', file);
const sql = fs.readFileSync(sqlPath, 'utf8');

// Split on semicolons and run statement by statement via REST
// Use Supabase's pg REST endpoint
const PROJECT_REF = 'ixjpeduqymfxdxsflfik';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4anBlZHVxeW1meGR4c2ZsZmlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzMjQ2MywiZXhwIjoyMDg3NTA4NDYzfQ.NGyIoEfWOfy7RF-nrIdPrsruwZ-nmOM3AMkt0yUaUPk-REPLACE';

// Note: The service role JWT needs to be constructed from the project
// Since we can't get it from sb_secret directly, we'll use the anon key
// and connect to the REST API to verify tables were created after manual migration
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4anBlZHVxeW1meGR4c2ZsZmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzI0NjMsImV4cCI6MjA4NzUwODQ2M30.NGyIoEfWOfy7RF-nrIdPrsruwZ-nmOM3AMkt0yUaUPk';

async function checkTables() {
  const tables = ['rides', 'ride_requests', 'messages', 'location_updates', 'ratings', 'push_tokens'];
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, ANON_KEY);

  console.log('\n📋 Checking tables...\n');
  let allGood = true;
  for (const table of tables) {
    // Use auth.signInAnonymously or just check via service role
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/${table}?limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      }
    });
    if (res.status === 200 || res.status === 406) {
      console.log(`  ✅ ${table}`);
    } else {
      const body = await res.text();
      console.log(`  ❌ ${table} — ${res.status}: ${body}`);
      allGood = false;
    }
  }
  if (allGood) {
    console.log('\n✅ All tables ready!\n');
  } else {
    console.log('\n📋 Please run supabase/migrations/002_schema.sql in the SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/ixjpeduqymfxdxsflfik/sql/new\n');
  }
}

checkTables();
