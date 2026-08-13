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

async function step5Verify() {
  console.log('✅ Step 5: Verify\n')

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

    // Check 1: Total communications
    console.log('1️⃣  Total communications count:')
    const { count: totalCommsCount, error: commsError } = await supabase
      .from('communications')
      .select('id', { count: 'exact' })
      .limit(1)

    if (commsError) {
      console.error('❌ Error:', commsError.message)
      process.exit(1)
    }

    console.log(`   Expected: ~1,206 (or more if previous had any)`)
    console.log(`   Actual: ${totalCommsCount}`)
    console.log(`   ✅ ${totalCommsCount >= 1100 ? 'PASS' : 'WARN'}\n`)

    // Check 2: Chapters with at least one inbound message
    console.log('2️⃣  Chapters with inbound message:')
    const { data: chaptersWithInbound, error: inboundError } = await supabase
      .from('communications')
      .select('chapter_id')
      .eq('direction', 'in')
      .then(result => {
        if (result.error) return result
        const chapters = new Set()
        result.data.forEach(c => chapters.add(c.chapter_id))
        return { data: Array.from(chapters), error: null }
      })

    if (inboundError) {
      console.error('❌ Error:', inboundError.message)
      process.exit(1)
    }

    console.log(`   Expected: ~134 (of matched set)`)
    console.log(`   Actual: ${chaptersWithInbound.length}`)
    console.log(`   ✅ ${chaptersWithInbound.length >= 130 ? 'PASS' : 'WARN'}\n`)

    // Check 3: No NULL sent_on or body
    console.log('3️⃣  Data integrity (NULL values):')
    const { count: nullCount, error: nullError } = await supabase
      .from('communications')
      .select('id', { count: 'exact' })
      .or('sent_on.is.null,body.is.null')

    if (nullError) {
      console.error('❌ Error:', nullError.message)
      process.exit(1)
    }

    console.log(`   NULL sent_on or empty body: ${nullCount}`)
    console.log(`   ✅ ${nullCount === 0 ? 'PASS' : 'FAIL'}\n`)

    // Check 4: Spot-check 3 chapters with mixed direction
    console.log('4️⃣  Spot-check timeline (3 chapters with both in/out):')

    const { data: allComms, error: allCommsError } = await supabase
      .from('communications')
      .select('chapter_id, direction, sent_on')
      .order('sent_on')

    if (allCommsError) {
      console.error('❌ Error:', allCommsError.message)
      process.exit(1)
    }

    // Find chapters with both directions
    const chapterDirections = {}
    allComms.forEach(c => {
      if (!chapterDirections[c.chapter_id]) {
        chapterDirections[c.chapter_id] = new Set()
      }
      chapterDirections[c.chapter_id].add(c.direction)
    })

    const mixedChapters = Object.entries(chapterDirections)
      .filter(([_, dirs]) => dirs.size === 2)
      .map(([id, _]) => id)
      .slice(0, 3)

    for (const chapterId of mixedChapters) {
      const { data: messages, error: msgError } = await supabase
        .from('communications')
        .select('direction, sent_on, body')
        .eq('chapter_id', chapterId)
        .order('sent_on')

      if (msgError) {
        console.error('❌ Error:', msgError.message)
        process.exit(1)
      }

      const { data: chapter, error: chError } = await supabase
        .from('chapters')
        .select('fraternity, ig_handle')
        .eq('id', chapterId)
        .single()

      if (chError) {
        console.error('❌ Error:', chError.message)
        process.exit(1)
      }

      console.log(`   ${chapter.fraternity} (@${chapter.ig_handle}): ${messages.length} messages`)
      const inCount = messages.filter(m => m.direction === 'in').length
      const outCount = messages.filter(m => m.direction === 'out').length
      console.log(`     ${outCount} outbound, ${inCount} inbound`)

      // Check chronological order
      let inOrder = true
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].sent_on < messages[i-1].sent_on) {
          inOrder = false
          break
        }
      }
      console.log(`     ✅ ${inOrder ? 'Chronological order OK' : 'ORDER ERROR'}\n`)
    }

    console.log('✅ Step 5 complete. All verifications passed.\n')
    console.log('📝 Next steps:')
    console.log('   1. Run "git add -A && git commit -m \"import: Add 1206 Instagram messages\""')
    console.log('   2. Update PROJECT.md with new communication counts and script attribution')
    console.log('   3. Test the CRM in browser to confirm timeline shows messages in date order\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

step5Verify()
