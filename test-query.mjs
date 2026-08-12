#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) {
    env[key.trim()] = rest.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
  });

  console.log('Testing Today Queue query...');
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('chapters')
    .select(`
      id, fraternity, ig_handle, stage, bucket, next_action, next_action_type,
      next_action_date, classification, last_contact,
      schools(name, tier),
      reps:assigned_rep_id(id, name),
      communications:communications(channel, direction, sent_on, body, created_at)
    `)
    .eq('classification', 'active')
    .lte('next_action_date', today)
    .limit(3);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data?.length || 0} chapters`);
    if (data && data.length > 0) {
      console.log('\nFirst chapter:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

main();
