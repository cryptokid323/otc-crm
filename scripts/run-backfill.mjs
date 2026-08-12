#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function runBackfill() {
  console.log('🔄 Running next_action_type backfill...\n')

  try {
    // Authenticate
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: env.TEST_EMAIL,
      password: env.TEST_PASSWORD,
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError.message)
      process.exit(1)
    }

    // Define updates
    const updates = [
      {
        type: 'send_dm',
        condition: (ch) => /dm test|a\/b\/c reset|send dm/i.test(ch.next_action),
        description: 'DM test / A/B/C reset / send dm'
      },
      {
        type: 'follow_up_1',
        condition: (ch) => /follow-up #1|follow up 1|fu1/i.test(ch.next_action),
        description: 'Follow-Up #1'
      },
      {
        type: 'follow_up_2',
        condition: (ch) => /follow-up #2|follow up 2|fu2/i.test(ch.next_action),
        description: 'Follow-Up #2'
      },
      {
        type: 'reply_thread',
        condition: (ch) => /reply and route|reply thread|categorize.*revive|reply with context.*route/i.test(ch.next_action),
        description: 'Reply and route / Categorize + revive / Reply with context + route'
      },
      {
        type: 'text_handoff',
        condition: (ch) => /reactivate by text/i.test(ch.next_action),
        description: 'Reactivate by text'
      },
      {
        type: 'find_alt_channel',
        condition: (ch) => /find officer personal ig|find alt/i.test(ch.next_action),
        description: 'Find officer personal IG / alt channel'
      },
      {
        type: 're_engage_later',
        condition: (ch) => /reactivate|re-engage/i.test(ch.next_action) && !/reactivate by text/i.test(ch.next_action),
        description: 'Reactivate / Re-engage'
      },
      {
        type: 'call',
        condition: (ch) => /\bcall\b/i.test(ch.next_action),
        description: 'Call'
      },
      {
        type: 'send_quote',
        condition: (ch) => /send quote|quote/i.test(ch.next_action),
        description: 'Send quote'
      },
      {
        type: 'schedule_call',
        condition: (ch) => /schedule.*call|call.*schedul/i.test(ch.next_action),
        description: 'Schedule call'
      }
    ]

    // Get all chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, fraternity, ig_handle, next_action, next_action_type')
      .not('next_action', 'is', null)

    if (chaptersError) {
      console.error('❌ Query error:', chaptersError.message)
      process.exit(1)
    }

    console.log(`Processing ${chapters.length} chapters...\n`)

    // Group chapters by type
    const grouped = {}
    const updatePromises = []

    for (const update of updates) {
      const matching = chapters.filter(ch =>
        ch.next_action_type === null && update.condition(ch)
      )

      if (matching.length > 0) {
        grouped[update.type] = matching.length

        // Update in batches
        for (let i = 0; i < matching.length; i += 100) {
          const batch = matching.slice(i, i + 100)
          const ids = batch.map(ch => ch.id)

          updatePromises.push(
            supabase
              .from('chapters')
              .update({ next_action_type: update.type })
              .in('id', ids)
              .then(({ error }) => {
                if (error) throw new Error(`${update.type}: ${error.message}`)
                return { type: update.type, count: ids.length }
              })
          )
        }
      }
    }

    // Special case: @pikapp_ucf with "Qualify: formal timing + headcount"
    const pikapp = chapters.find(ch =>
      ch.ig_handle === 'pikapp_ucf' &&
      ch.next_action === 'Qualify: formal timing + headcount' &&
      ch.next_action_type === null
    )

    if (pikapp) {
      grouped['schedule_call'] = (grouped['schedule_call'] || 0) + 1
      updatePromises.push(
        supabase
          .from('chapters')
          .update({ next_action_type: 'schedule_call' })
          .eq('id', pikapp.id)
          .then(({ error }) => {
            if (error) throw new Error(`schedule_call (@pikapp_ucf): ${error.message}`)
            return { type: 'schedule_call', count: 1, note: '@pikapp_ucf one-off' }
          })
      )
    }

    // Run all updates
    const results = await Promise.all(updatePromises)

    console.log('✅ Updates applied:\n')
    Object.entries(grouped).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(18)} ${String(count).padStart(3)} chapters`)
    })

    // Verify backfill
    console.log('\n🔍 Verifying backfill...\n')

    const { data: verified } = await supabase
      .from('chapters')
      .select('next_action_type')

    const counts = {}
    let nullCount = 0

    verified.forEach(ch => {
      if (ch.next_action_type === null) {
        nullCount++
      } else {
        counts[ch.next_action_type] = (counts[ch.next_action_type] || 0) + 1
      }
    })

    console.log('📊 Verification results:\n')
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(18)} ${String(count).padStart(3)} chapters`)
      })

    console.log(`\n  NULL values:       ${nullCount}`)
    console.log(`  Total:             ${verified.length}`)

    if (nullCount === 0) {
      console.log('\n✅ Perfect! All 611 chapters have next_action_type assigned.')
    } else {
      console.log(`\n⚠️  ${nullCount} chapters still have NULL next_action_type`)
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

runBackfill()
