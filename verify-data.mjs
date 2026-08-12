#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) {
    env[key.trim()] = rest.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = env.TEST_EMAIL;
const testPassword = env.TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey || !testEmail || !testPassword) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.error('Auth error:', authError);
      process.exit(1);
    }

    console.log('✓ Signed in as:', testEmail);
    console.log('');

    // Check chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .limit(3);

    console.log('Chapters (first 3):');
    if (chaptersError) {
      console.error('Error:', chaptersError);
    } else {
      console.log(`Total rows accessible: ${chapters?.length || 0}`);
      if (chapters?.length > 0) {
        console.log('Columns:', Object.keys(chapters[0]));
        console.log(JSON.stringify(chapters[0], null, 2));
      }
    }
    console.log('');

    // Check reps
    const { data: reps, error: repsError } = await supabase
      .from('reps')
      .select('*');

    console.log('Reps:');
    if (repsError) {
      console.error('Error:', repsError);
    } else {
      console.log(`Total reps: ${reps?.length || 0}`);
      if (reps?.length > 0) {
        console.log('Columns:', Object.keys(reps[0]));
        console.log(JSON.stringify(reps, null, 2));
      }
    }
    console.log('');

    // Check schools - count total
    const { count: schoolCount, error: schoolCountError } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    const { data: schoolsSample, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, tier, region')
      .limit(5);

    console.log('Schools:');
    if (schoolCountError) {
      console.error('Error counting:', schoolCountError);
    } else {
      console.log(`Total schools: ${schoolCount}`);
    }
    if (schoolsError) {
      console.error('Error fetching sample:', schoolsError);
    } else if (schoolsSample?.length > 0) {
      console.log(`Sample (first 5):`);
      console.log(JSON.stringify(schoolsSample, null, 2));
    }
    console.log('');

    // Check communications
    const { data: comms, error: commsError } = await supabase
      .from('communications')
      .select('*')
      .limit(3);

    console.log('Communications (first 3):');
    if (commsError) {
      console.error('Error:', commsError);
    } else {
      console.log(`Total communications accessible: ${comms?.length || 0}`);
      if (comms?.length > 0) {
        console.log('Columns:', Object.keys(comms[0]));
        console.log(JSON.stringify(comms[0], null, 2));
      }
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
