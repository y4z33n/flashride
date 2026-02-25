// Run this once to create the profiles table
// node scripts/migrate.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ixjpeduqymfxdxsflfik.supabase.co';
// Use the anon key — we'll run DDL via the SQL editor directly
// This script just verifies the table exists after manual migration
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4anBlZHVxeW1meGR4c2ZsZmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzI0NjMsImV4cCI6MjA4NzUwODQ2M30.NGyIoEfWOfy7RF-nrIdPrsruwZ-nmOM3AMkt0yUaUPk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.log('❌ profiles table not ready:', error.message);
    console.log('\n📋 Please run the SQL in supabase/migrations/001_profiles.sql');
    console.log('   Go to: https://supabase.com/dashboard/project/ixjpeduqymfxdxsflfik/sql/new');
  } else {
    console.log('✅ profiles table exists and is accessible!');
  }
}

checkTable();
