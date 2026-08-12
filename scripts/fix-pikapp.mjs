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

async function fixPikapp() {
  await supabase.auth.signInWithPassword({
    email: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
  })

  const { error } = await supabase
    .from('chapters')
    .update({ next_action_type: 'schedule_call' })
    .eq('id', '73ffe990-b111-5dee-8b93-bc31df5a2d61')

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log('✓ Updated @pikapp_ucf to schedule_call')

  // Verify
  const { data } = await supabase
    .from('chapters')
    .select('next_action_type')

  const counts = {}
  let nullCount = 0

  data.forEach(ch => {
    if (ch.next_action_type === null) {
      nullCount++
    } else {
      counts[ch.next_action_type] = (counts[ch.next_action_type] || 0) + 1
    }
  })

  console.log('\n✅ Final verification:\n')
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(18)} ${String(count).padStart(3)} chapters`)
    })
  console.log(`  NULL values:       ${nullCount}`)
  console.log(`  Total:             ${data.length}`)

  if (nullCount === 0) {
    console.log('\n🎉 Perfect! All 611 chapters have next_action_type assigned.')
  }
}

fixPikapp()
