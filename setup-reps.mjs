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

  console.log('Setting up reps...');
  console.log('');

  // Get current reps
  const { data: reps } = await supabase.from('reps').select('*');
  console.log('Current reps:', reps?.map(r => ({ id: r.id, name: r.name })));

  // Update emails for Michael and Tyler
  const michael = reps?.find(r => r.name === 'Michael');
  const tyler = reps?.find(r => r.name === 'Tyler');

  if (michael) {
    const { error } = await supabase
      .from('reps')
      .update({ email: 'michaelvita@otctrips.com' })
      .eq('id', michael.id);
    if (error) {
      console.error('Error updating Michael:', error);
    } else {
      console.log('✓ Updated Michael with email');
    }
  }

  if (tyler) {
    const { error } = await supabase
      .from('reps')
      .update({ email: 'tylerdaley@otctrips.com' })
      .eq('id', tyler.id);
    if (error) {
      console.error('Error updating Tyler:', error);
    } else {
      console.log('✓ Updated Tyler with email');
    }
  }

  // Create Davis
  const { data: davis, error: davisError } = await supabase
    .from('reps')
    .insert({ name: 'Davis', email: 'davisdeal@otctrips.com', active: true })
    .select();

  if (davisError) {
    console.error('Error creating Davis:', davisError);
  } else {
    console.log('✓ Created Davis rep');
  }

  // Show final reps
  const { data: finalReps } = await supabase.from('reps').select('*');
  console.log('');
  console.log('Final reps:');
  finalReps?.forEach(r => {
    console.log(`  ${r.name} (${r.id.slice(0, 8)}...): ${r.email || '(no email)'}`);
  });
}

main();
