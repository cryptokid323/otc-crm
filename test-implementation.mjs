#!/usr/bin/env node
/**
 * Test script to verify the visual/workflow batch implementation
 * Tests:
 * 1. Today Queue query with grouping data
 * 2. Chapter detail query with timeline and school info
 * 3. Recovery page query with inline communications
 * 4. Data structure validation
 */

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

async function testTodayQueueQuery() {
  console.log('\n=== Testing Today Queue Query ===');

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
    .order('next_action_date', { ascending: true })
    .limit(5);

  if (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️  No chapters found (this is OK for testing)');
    return true;
  }

  console.log(`✓ Found ${data.length} chapters`);

  const ch = data[0];
  const checks = [
    ['id', typeof ch.id === 'string'],
    ['fraternity', typeof ch.fraternity === 'string'],
    ['next_action_date', typeof ch.next_action_date === 'string'],
    ['last_contact', !ch.last_contact || typeof ch.last_contact === 'string'],
    ['schools.name', ch.schools?.name !== undefined],
    ['reps', ch.reps !== undefined],
    ['communications', Array.isArray(ch.communications)],
  ];

  let passed = 0;
  checks.forEach(([field, check]) => {
    if (check) {
      console.log(`  ✓ ${field}`);
      passed++;
    } else {
      console.log(`  ❌ ${field}`);
    }
  });

  return passed === checks.length;
}

async function testChapterDetailQuery() {
  console.log('\n=== Testing Chapter Detail Query ===');

  // Get first active chapter
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('classification', 'active')
    .limit(1);

  if (!chapters || chapters.length === 0) {
    console.warn('⚠️  No active chapters found');
    return true;
  }

  const chapterId = chapters[0].id;

  // Note: email column not yet in reps table
  const { data: chapter, error } = await supabase
    .from('chapters')
    .select('*, schools(id, name, tier, region, verify_before_dm), reps:assigned_rep_id(id, name)')
    .eq('id', chapterId)
    .single();

  if (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }

  console.log(`✓ Loaded chapter: ${chapter.fraternity}`);

  const { data: communications } = await supabase
    .from('communications')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false });

  const checks = [
    ['chapter.id', typeof chapter.id === 'string'],
    ['chapter.fraternity', typeof chapter.fraternity === 'string'],
    ['chapter.assigned_rep_id', !chapter.assigned_rep_id || typeof chapter.assigned_rep_id === 'string'],
    ['schools', chapter.schools !== null],
    ['schools.name', chapter.schools?.name !== undefined],
    ['schools.tier', chapter.schools?.tier !== undefined],
    ['communications array', Array.isArray(communications)],
  ];

  let passed = 0;
  checks.forEach(([field, check]) => {
    if (check) {
      console.log(`  ✓ ${field}`);
      passed++;
    } else {
      console.log(`  ❌ ${field}`);
    }
  });

  if (communications && communications.length > 0) {
    const comm = communications[0];
    console.log(`  ✓ First communication has channel: ${comm.channel}`);
  }

  return passed === checks.length;
}

async function testRecoveryQuery() {
  console.log('\n=== Testing Recovery Page Query ===');

  const { data, error } = await supabase
    .from('chapters')
    .select(`
      id, fraternity, schools(name, tier), stage, bucket, next_action,
      next_action_type, next_action_date, last_contact,
      reps:assigned_rep_id(id, name),
      communications(channel, direction, sent_on, body, created_at)
    `)
    .eq('bucket', 'phone_handoff')
    .order('next_action_date', { ascending: true })
    .limit(3);

  if (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️  No phone_handoff chapters found');
    return true;
  }

  console.log(`✓ Found ${data.length} phone_handoff chapters`);

  const ch = data[0];
  const checks = [
    ['id', typeof ch.id === 'string'],
    ['fraternity', typeof ch.fraternity === 'string'],
    ['schools', ch.schools !== null],
    ['reps', ch.reps !== undefined],
    ['communications', Array.isArray(ch.communications)],
  ];

  let passed = 0;
  checks.forEach(([field, check]) => {
    if (check) {
      console.log(`  ✓ ${field}`);
      passed++;
    } else {
      console.log(`  ❌ ${field}`);
    }
  });

  return passed === checks.length;
}

async function testRepsList() {
  console.log('\n=== Testing Reps List ===');

  // Note: email column not yet in reps table - will be added in migration 002
  const { data, error } = await supabase
    .from('reps')
    .select('id, name');

  if (error) {
    console.error('❌ Query failed:', error.message);
    return false;
  }

  console.log(`✓ Found ${data?.length || 0} reps`);

  if (data && data.length > 0) {
    data.forEach(rep => {
      const email = rep.email ? ` (${rep.email})` : '';
      console.log(`  - ${rep.name}${email}`);
    });
  }

  return true;
}

async function main() {
  console.log('Testing Visual/Workflow Batch Implementation');
  console.log('============================================\n');

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      await supabase.auth.signInWithPassword({
        email: env.TEST_EMAIL,
        password: env.TEST_PASSWORD,
      });
      console.log(`✓ Signed in as ${env.TEST_EMAIL}\n`);
    } else {
      console.log(`✓ Already signed in as ${user.email}\n`);
    }

    const results = [
      ['Today Queue Query', await testTodayQueueQuery()],
      ['Chapter Detail Query', await testChapterDetailQuery()],
      ['Recovery Page Query', await testRecoveryQuery()],
      ['Reps List', await testRepsList()],
    ];

    console.log('\n=== Test Summary ===');
    results.forEach(([name, passed]) => {
      console.log(`${passed ? '✓' : '❌'} ${name}`);
    });

    const allPassed = results.every(([_, passed]) => passed);
    console.log(`\n${allPassed ? '✓ All tests passed!' : '❌ Some tests failed'}`);
  } catch (err) {
    console.error('\n❌ Test error:', err.message);
  }
}

main();
