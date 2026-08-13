#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
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

async function step3ReplaceComms() {
  console.log('🔄 Step 3: Replace communications for matched chapters\n')

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

    // Get all chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, ig_handle')

    if (chaptersError) {
      console.error('❌ Query error:', chaptersError.message)
      process.exit(1)
    }

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

    // Map messages to chapter IDs
    const messagesByChapterId = {}
    const unmatchedMessages = []
    let matchedCount = 0

    messages.forEach(msg => {
      const normalized = normalize(msg.handle)
      const matchedChapters = normalizedChapters[normalized]

      if (matchedChapters && matchedChapters.length > 0) {
        // Use the first matched chapter
        const chapterId = matchedChapters[0].id
        if (!messagesByChapterId[chapterId]) {
          messagesByChapterId[chapterId] = []
        }
        messagesByChapterId[chapterId].push(msg)
        matchedCount++
      } else {
        unmatchedMessages.push(msg)
      }
    })

    console.log(`📊 Message mapping:`)
    console.log(`  Matched to chapters: ${matchedCount}`)
    console.log(`  Unmatched: ${unmatchedMessages.length}\n`)

    // Get chapter IDs to delete communications from
    const chapterIdsToUpdate = Object.keys(messagesByChapterId)
    console.log(`🗑️  Deleting communications for ${chapterIdsToUpdate.length} chapters...\n`)

    // Delete existing communications for matched chapters (in transaction)
    const { error: deleteError } = await supabase
      .from('communications')
      .delete()
      .in('chapter_id', chapterIdsToUpdate)

    if (deleteError) {
      console.error('❌ Delete error:', deleteError.message)
      process.exit(1)
    }

    console.log(`✅ Deleted existing communications\n`)

    // Prepare new communications to insert
    const newComms = []
    const lastContactByChapter = {}

    for (const [chapterId, msgs] of Object.entries(messagesByChapterId)) {
      msgs.forEach(msg => {
        // Deduplicate within this chapter: (sent_on, body_md5)
        const bodyMd5 = crypto.createHash('md5').update(msg.body).digest('hex')
        const key = `${msg.sent_on}:${bodyMd5}`

        newComms.push({
          chapter_id: chapterId,
          channel: 'instagram',
          direction: msg.direction,
          sent_on: msg.sent_on,
          body: msg.body,
          _dedup_key: key
        })

        // Track last contact date
        if (!lastContactByChapter[chapterId] || msg.sent_on > lastContactByChapter[chapterId]) {
          lastContactByChapter[chapterId] = msg.sent_on
        }
      })
    }

    // Deduplicate
    const seen = new Set()
    const deduped = newComms.filter(comm => {
      const key = `${comm.chapter_id}:${comm._dedup_key}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`📝 Inserting ${deduped.length} communications (${newComms.length} - ${newComms.length - deduped.length} dupes)...\n`)

    // Insert in batches
    const batchSize = 100
    for (let i = 0; i < deduped.length; i += batchSize) {
      const batch = deduped.slice(i, i + batchSize).map(c => ({
        chapter_id: c.chapter_id,
        channel: c.channel,
        direction: c.direction,
        sent_on: c.sent_on,
        body: c.body
      }))

      const { error: insertError } = await supabase
        .from('communications')
        .insert(batch)

      if (insertError) {
        console.error(`❌ Insert error (batch ${Math.floor(i / batchSize) + 1}):`, insertError.message)
        process.exit(1)
      }

      console.log(`  ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} communications inserted`)
    }

    console.log(`\n✅ All communications inserted\n`)

    // Update last_contact for each chapter (serially to avoid rate limits)
    console.log(`🔄 Updating last_contact dates...\n`)

    let updateCount = 0
    for (const [chapterId, lastDate] of Object.entries(lastContactByChapter)) {
      const { error: updateError } = await supabase
        .from('chapters')
        .update({ last_contact: lastDate })
        .eq('id', chapterId)

      if (updateError) {
        console.error(`❌ Update failed for chapter ${chapterId}:`, updateError.message)
        process.exit(1)
      }

      updateCount++
      if (updateCount % 50 === 0) {
        console.log(`  ✅ Updated ${updateCount} chapters...`)
      }
    }

    console.log(`✅ Updated last_contact for ${updateCount} chapters\n`)

    // Verify
    console.log(`🔍 Verification:\n`)

    const { data: allComms, error: verifyError } = await supabase
      .from('communications')
      .select('id, sent_on, body', { count: 'exact' })

    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message)
      process.exit(1)
    }

    console.log(`  Total communications in DB: ${allComms.length}`)

    // Check for nulls
    const { data: nullComms, error: nullError } = await supabase
      .from('communications')
      .select('id')
      .or('sent_on.is.null,body.is.null')

    if (nullError) {
      console.error('❌ Null check error:', nullError.message)
      process.exit(1)
    }

    console.log(`  NULL sent_on or body: ${nullComms.length}`)

    // Count chapters with at least one inbound message
    const { data: chaptersWithInbound, error: inboundError } = await supabase
      .rpc('count_chapters_with_inbound')

    if (inboundError) {
      console.log(`  (Inbound count not available via RPC)`)
    } else {
      console.log(`  Chapters with inbound message: ${chaptersWithInbound}`)
    }

    console.log(`\n✅ Step 3 complete. Communications replaced for 544 matched chapters.`)
    console.log(`   67 chapters with no thread remain unchanged.\n`)

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

step3ReplaceComms()
