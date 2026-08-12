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

async function previewBackfill() {
  console.log('📊 Previewing next_action_type backfill mappings...\n')

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

    // Get all chapters with next_action
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, next_action, next_action_type')
      .not('next_action', 'is', null)

    if (chaptersError) {
      console.error('❌ Query error:', chaptersError.message)
      process.exit(1)
    }

    console.log(`Total chapters with next_action: ${chapters.length}\n`)

    // Count matches for each pattern
    const patterns = [
      {
        type: 'send_dm',
        matchers: [ch => /dm test|a\/b\/c reset|send dm/i.test(ch.next_action)],
        label: 'DM test / A/B/C reset / send dm'
      },
      {
        type: 'follow_up_1',
        matchers: [ch => /follow-up #1|follow up 1|fu1/i.test(ch.next_action)],
        label: 'Follow-Up #1 / Follow Up 1 / FU1'
      },
      {
        type: 'follow_up_2',
        matchers: [ch => /follow-up #2|follow up 2|fu2/i.test(ch.next_action)],
        label: 'Follow-Up #2 / Follow Up 2 / FU2'
      },
      {
        type: 'reply_thread',
        matchers: [ch => /reply and route|reply thread|categorize.*revive|reply with context.*route/i.test(ch.next_action)],
        label: 'Reply and route / Categorize + revive / Reply with context + route'
      },
      {
        type: 'text_handoff',
        matchers: [ch => /reactivate by text/i.test(ch.next_action)],
        label: 'Reactivate by text'
      },
      {
        type: 'find_alt_channel',
        matchers: [ch => /find officer personal ig|find alt/i.test(ch.next_action)],
        label: 'Find officer personal IG / Find alt'
      },
      {
        type: 're_engage_later',
        matchers: [ch => /reactivate|re-engage/i.test(ch.next_action) && !/reactivate by text/i.test(ch.next_action)],
        label: 'Reactivate / Re-engage (excluding text handoff)'
      },
      {
        type: 'call',
        matchers: [ch => /\bcall\b/i.test(ch.next_action)],
        label: 'Call'
      },
      {
        type: 'send_quote',
        matchers: [ch => /send quote|quote/i.test(ch.next_action)],
        label: 'Send quote / Quote'
      },
      {
        type: 'schedule_call',
        matchers: [ch => /schedule.*call|call.*schedul/i.test(ch.next_action)],
        label: 'Schedule call'
      }
    ]

    const results = []
    const matched = new Set()

    for (const pattern of patterns) {
      const matchingChapters = chapters.filter(ch => {
        const isMatch = pattern.matchers.every(matcher => matcher(ch))
        if (isMatch) matched.add(ch.id)
        return isMatch
      })

      results.push({
        type: pattern.type,
        label: pattern.label,
        count: matchingChapters.count || matchingChapters.length,
        chapters: matchingChapters.slice(0, 3)
      })
    }

    // Show results
    console.log('📈 Mapping counts:\n')
    results
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .forEach(r => {
        console.log(`${r.type.padEnd(18)} ${String(r.count).padStart(4)} chapters`)
        console.log(`  Pattern: ${r.label}`)
        if (r.chapters.length > 0) {
          r.chapters.slice(0, 2).forEach(ch => {
            const excerpt = ch.next_action.substring(0, 60).replace(/\n/g, ' ')
            console.log(`    • "${excerpt}${ch.next_action.length > 60 ? '...' : ''}"`)
          })
        }
        console.log()
      })

    const unmappedCount = chapters.length - matched.size
    console.log(`\n⚠️  Unmapped chapters: ${unmappedCount} (will remain unset)`)

    console.log(`\n✅ Preview complete. Review counts above, then run the backfill UPDATE statements.`)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

previewBackfill()
