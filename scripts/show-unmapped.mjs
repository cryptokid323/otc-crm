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

async function showUnmapped() {
  console.log('🔍 Finding unmapped chapters...\n')

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

    // Get all chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, next_action, bucket')
      .not('next_action', 'is', null)

    if (chaptersError) {
      console.error('❌ Query error:', chaptersError.message)
      process.exit(1)
    }

    // Patterns that should be mapped
    const patterns = [
      ch => /dm test|a\/b\/c reset|send dm/i.test(ch.next_action),
      ch => /follow-up #1|follow up 1|fu1/i.test(ch.next_action),
      ch => /follow-up #2|follow up 2|fu2/i.test(ch.next_action),
      ch => /reply and route|reply thread/i.test(ch.next_action),
      ch => /reactivate by text/i.test(ch.next_action),
      ch => /find officer personal ig|find alt/i.test(ch.next_action),
      ch => /reactivate|re-engage/i.test(ch.next_action) && !/reactivate by text/i.test(ch.next_action),
      ch => /\bcall\b/i.test(ch.next_action),
      ch => /send quote|quote/i.test(ch.next_action),
      ch => /schedule.*call|call.*schedul/i.test(ch.next_action)
    ]

    // Find unmapped
    const unmapped = chapters.filter(ch =>
      !patterns.some(pattern => pattern(ch))
    )

    console.log(`Total unmapped: ${unmapped.length}\n`)

    // Group by next_action value
    const grouped = {}
    unmapped.forEach(ch => {
      if (!grouped[ch.next_action]) {
        grouped[ch.next_action] = []
      }
      grouped[ch.next_action].push(ch)
    })

    // Show distinct values with counts
    console.log('📋 Distinct unmapped next_action values:\n')
    Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([action, chapters]) => {
        console.log(`"${action}"`)
        console.log(`  Count: ${chapters.length}`)

        // Show bucket breakdown
        const bucketCounts = {}
        chapters.forEach(ch => {
          if (!bucketCounts[ch.bucket]) bucketCounts[ch.bucket] = 0
          bucketCounts[ch.bucket]++
        })

        Object.entries(bucketCounts).forEach(([bucket, count]) => {
          console.log(`    ${bucket}: ${count}`)
        })
        console.log()
      })

    console.log(`✅ Review complete.`)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

showUnmapped()
