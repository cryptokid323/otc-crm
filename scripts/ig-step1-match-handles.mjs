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

// Normalize handle: lowercase, strip @, strip _<digits> at end
function normalize(handle) {
  return handle
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/_\d+$/, '')
}

async function step1MatchHandles() {
  console.log('📊 Step 1: Match handles → chapters\n')

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

    // Load messages
    const messagesPath = path.join(process.cwd(), 'data', 'ig_messages_import.json')
    const messagesRaw = fs.readFileSync(messagesPath, 'utf8')
    const messages = JSON.parse(messagesRaw)

    console.log(`✅ Loaded ${messages.length} messages from import\n`)

    // Get unique handles from messages
    const messageHandles = new Set(messages.map(m => m.handle))
    console.log(`✅ Found ${messageHandles.size} unique handles in messages\n`)

    // Get all chapters with ig_handle
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, fraternity, ig_handle')

    if (chaptersError) {
      console.error('❌ Query error:', chaptersError.message)
      process.exit(1)
    }

    console.log(`✅ Loaded ${chapters.length} chapters from CRM\n`)

    // Build normalized index of chapters
    const normalizedChapters = {}
    chapters.forEach(ch => {
      if (ch.ig_handle) {
        const normalized = normalize(ch.ig_handle)
        if (!normalizedChapters[normalized]) {
          normalizedChapters[normalized] = []
        }
        normalizedChapters[normalized].push(ch)
      }
    })

    // Match messages to chapters
    const matched = new Map()
    const unmatched = new Map()

    messageHandles.forEach(handle => {
      const normalized = normalize(handle)
      const matchedChapters = normalizedChapters[normalized]

      if (matchedChapters && matchedChapters.length > 0) {
        matched.set(handle, matchedChapters)
      } else {
        unmatched.set(handle, null)
      }
    })

    // Report summary
    console.log('📈 MATCHING SUMMARY:\n')
    console.log(`  Threads matched to chapters: ${matched.size}`)
    console.log(`  Unmatched fraternity handles: ${unmatched.size}`)

    // Chapters in CRM with no thread
    const chapterHandlesInMessages = new Set()
    matched.forEach((chapters, handle) => {
      chapters.forEach(ch => chapterHandlesInMessages.add(ch.id))
    })
    const unmatchedChapters = chapters.length - chapterHandlesInMessages.size
    console.log(`  Chapters in CRM with no thread: ${unmatchedChapters}\n`)

    // Now build detailed unmatched list
    console.log('📋 UNMATCHED HANDLES FOR REVIEW:\n')
    console.log('handle,display_name,message_count,has_replies,first_date,last_date,suggested_school\n')

    // Analyze each unmatched handle
    const unmatchedDetails = []
    unmatched.forEach((_, handle) => {
      const handleMessages = messages.filter(m => m.handle === handle)
      const inbound = handleMessages.filter(m => m.direction === 'in')
      const hasReplies = inbound.length > 0

      const dates = handleMessages
        .map(m => m.sent_on)
        .sort()

      const firstDate = dates[0]
      const lastDate = dates[dates.length - 1]

      // Try to infer school from handle
      let suggestedSchool = ''
      const handle_lower = handle.toLowerCase()

      // Look for school abbreviations in the handle
      if (handle_lower.includes('ufl')) suggestedSchool = 'UFL'
      else if (handle_lower.includes('fsu')) suggestedSchool = 'FSU'
      else if (handle_lower.includes('ucf')) suggestedSchool = 'UCF'
      else if (handle_lower.includes('uf_')) suggestedSchool = 'UFL'
      else if (handle_lower.match(/^[a-z]+_\d+$/)) {
        // Pattern like "pike_123" or "sig_456"
        const frat = handle_lower.split('_')[0]
        // This is just the fraternity part, school is harder to infer
      }

      unmatchedDetails.push({
        handle,
        messageCount: handleMessages.length,
        hasReplies,
        firstDate,
        lastDate,
        suggestedSchool
      })
    })

    // Sort by message count descending
    unmatchedDetails.sort((a, b) => b.messageCount - a.messageCount)

    // Output CSV
    unmatchedDetails.forEach(detail => {
      console.log(
        `"${detail.handle}","${detail.handle}",${detail.messageCount},${detail.hasReplies ? 'Yes' : 'No'},${detail.firstDate},${detail.lastDate},"${detail.suggestedSchool}"`
      )
    })

    console.log('\n✅ Step 1 complete. Review the unmatched list above.')
    console.log('   When ready, user should approve in step 2 before creating chapters.\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

step1MatchHandles()
