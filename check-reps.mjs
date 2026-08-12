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

  // Count chapters
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('assigned_rep_id');

  console.log('Total chapters:', allChapters?.length || 0);
  console.log('');

  const repCounts = {};
  if (allChapters) {
    allChapters.forEach(ch => {
      const repId = ch.assigned_rep_id;
      repCounts[repId] = (repCounts[repId] || 0) + 1;
    });
  }

  // Get reps with counts
  const { data: reps } = await supabase.from('reps').select('*');
  console.log('Reps:');
  reps?.forEach(rep => {
    console.log(`  ${rep.name} (${rep.id}): ${repCounts[rep.id] || 0} chapters`);
  });
}

main();
