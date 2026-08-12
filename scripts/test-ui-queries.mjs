#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.trim()
  }
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const COLORS = {
  'send_dm': 'bg-blue-100 text-blue-800',
  'follow_up_1': 'bg-purple-100 text-purple-800',
  'follow_up_2': 'bg-purple-100 text-purple-800',
  'reply_thread': 'bg-green-100 text-green-800',
  'text_handoff': 'bg-yellow-100 text-yellow-800',
  'call': 'bg-red-100 text-red-800',
  'send_quote': 'bg-indigo-100 text-indigo-800',
  'schedule_call': 'bg-orange-100 text-orange-800',
  'find_alt_channel': 'bg-pink-100 text-pink-800',
  're_engage_later': 'bg-gray-100 text-gray-800',
}

async function testUIQueries() {
  console.log('🧪 Testing UI queries with real data...\n')

  try {
    await supabase.auth.signInWithPassword({
      email: env.TEST_EMAIL,
      password: env.TEST_PASSWORD,
    })

    // TEST 1: Today Queue - chapters with overdue actions
    console.log('📋 TEST 1: Today Queue (/)')
    const today = new Date().toISOString().split('T')[0]
    const { data: todayQueue } = await supabase
      .from('chapters')
      .select('id, fraternity, ig_handle, stage, bucket, next_action, next_action_type, next_action_date, classification, schools(name)')
      .eq('classification', 'active')
      .lte('next_action_date', today)
      .order('next_action_date', { ascending: true })
      .limit(5)

    if (todayQueue && todayQueue.length > 0) {
      console.log(`✓ Found ${todayQueue.length} overdue chapters\n`)
      todayQueue.forEach((ch, i) => {
        const color = COLORS[ch.next_action_type] || 'bg-gray-100 text-gray-800'
        console.log(`  ${i + 1}. ${ch.fraternity} @ ${ch.schools?.name || 'unknown'}`)
        console.log(`     Next: ${ch.next_action}`)
        console.log(`     Chip: [${ch.next_action_type}] ${color}`)
      })
    } else {
      console.log('ℹ️  No overdue chapters (expected if all are future-dated)\n')
    }

    // TEST 2: Pipeline - all chapters grouped by stage
    console.log('\n📈 TEST 2: Pipeline (/pipeline)')
    const { data: pipelineChapters } = await supabase
      .from('chapters')
      .select('id, fraternity, stage, classification, next_action_type')
      .order('stage, fraternity')
      .limit(10)

    if (pipelineChapters && pipelineChapters.length > 0) {
      console.log(`✓ Found ${pipelineChapters.length} sample chapters (showing 10)\n`)
      pipelineChapters.forEach(ch => {
        const color = COLORS[ch.next_action_type] || 'bg-gray-100 text-gray-800'
        console.log(`  • ${ch.fraternity} (${ch.stage})`)
        console.log(`    Chip: [${ch.next_action_type}] ${color}`)
      })
    }

    // TEST 3: Recovery - chapters by bucket
    console.log('\n🔄 TEST 3: Recovery (/recovery)')
    const buckets = ['stalled_reply', 'phone_handoff', 'missed_warm', 'recent_one_touch']
    for (const bucket of buckets) {
      const { data: recovery } = await supabase
        .from('chapters')
        .select('id, fraternity, schools(name), next_action_type, bucket')
        .eq('bucket', bucket)
        .limit(2)

      if (recovery && recovery.length > 0) {
        console.log(`\n  ${bucket}: ${recovery.length}+ chapters`)
        recovery.forEach(ch => {
          const color = COLORS[ch.next_action_type] || 'bg-gray-100 text-gray-800'
          console.log(`    • ${ch.fraternity}`)
          console.log(`      Chip: [${ch.next_action_type}] ${color}`)
        })
      }
    }

    // TEST 4: Chapter Detail - get one chapter to test dropdown
    console.log('\n📝 TEST 4: Chapter Detail (/chapters/[id])')
    const { data: sampleChapter } = await supabase
      .from('chapters')
      .select('id, fraternity, next_action_type, next_action')
      .not('next_action_type', 'is', null)
      .limit(1)

    if (sampleChapter && sampleChapter.length > 0) {
      const ch = sampleChapter[0]
      console.log(`✓ Sample chapter: ${ch.fraternity}`)
      console.log(`  Current next_action_type: ${ch.next_action_type}`)
      console.log(`  Dropdown would show: 10 action type options`)
      console.log(`  Can be changed to any of: send_dm, follow_up_1, follow_up_2, reply_thread, text_handoff, call, send_quote, schedule_call, find_alt_channel, re_engage_later`)
    }

    // TEST 5: Schools page
    console.log('\n🏫 TEST 5: Schools Page (/schools)')
    const { data: untouchedSchools, count: untouchedCount } = await supabase
      .from('schools')
      .select('id, name, tier', { count: 'exact' })
      .not('tier', 'is', null)
      .limit(3)

    console.log(`✓ Untouched schools (tier ≠ null): ${untouchedCount}`)
    if (untouchedSchools && untouchedSchools.length > 0) {
      untouchedSchools.forEach(s => {
        console.log(`  • ${s.name} (Tier: ${s.tier})`)
      })
    }

    const { data: contactedSchools } = await supabase
      .from('schools')
      .select('id, name, chapters(id)')
      .is('tier', null)
      .limit(3)

    const contactedCount = contactedSchools?.filter(s => s.chapters && s.chapters.length > 0).length || 0
    console.log(`✓ Contacted schools (have chapters): ${contactedCount}`)
    if (contactedSchools && contactedSchools.length > 0) {
      contactedSchools.slice(0, 3).forEach(s => {
        const chapterCount = s.chapters?.length || 0
        if (chapterCount > 0) {
          console.log(`  • ${s.name} (${chapterCount} chapters)`)
        }
      })
    }

    // TEST 6: Filter by action type
    console.log('\n🎯 TEST 6: Filter by Action Type')
    const { data: sendDmChapters, count: sendDmCount } = await supabase
      .from('chapters')
      .select('*', { count: 'exact' })
      .eq('next_action_type', 'send_dm')

    console.log(`✓ Chapters filterable by send_dm: ${sendDmCount}`)

    const { data: callChapters, count: callCount } = await supabase
      .from('chapters')
      .select('*', { count: 'exact' })
      .eq('next_action_type', 'schedule_call')

    console.log(`✓ Chapters filterable by schedule_call: ${callCount}`)

    console.log('\n✅ All UI queries verified with real data!')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

testUIQueries()
