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

// Mapping of handles to school IDs (inferred by user)
const schoolInference = {
  'sigmachizetazeta': 'fd06ccee-9b04-5cfd-83dc-273643874fa9', // Unidentified
  'pkanuchapter': 'fd06ccee-9b04-5cfd-83dc-273643874fa9', // Unidentified
  'fiusigepalumni': 'c337fe81-cc73-557c-b73e-ad3c83dc05ec', // Florida International University
  'sigmachiunivofsouthflorida': 'f2c3652d-5669-5594-9f6e-f1da762ff7dc', // University of South Florida
  'sigmachischfloridainternational': 'c337fe81-cc73-557c-b73e-ad3c83dc05ec', // Florida International University
  'tauepsilonphi': 'fd06ccee-9b04-5cfd-83dc-273643874fa9', // Unidentified
  'tennesseepikespka': '531cc6ff-7e4b-5753-932b-3f1dff10d14c', // University of Tennessee, Knoxville
  'pkatheuniversityofflorida': '695dffae-5e4c-5055-afe0-93248447f57f', // University of Florida
  'saeindianaalpha': '55ed875f-fec3-56f7-b206-b50dc7ee344a' // Indiana University Bloomington
}

// Extract fraternity name from handle
function extractFraternity(handle) {
  const handle_lower = handle.toLowerCase()

  // Common patterns
  if (handle_lower.includes('pikapp') || handle_lower.includes('pka')) return 'Pi Kappa Alpha'
  if (handle_lower.includes('sigmachi')) return 'Sigma Chi'
  if (handle_lower.includes('sigep') || handle_lower.includes('sig ep')) return 'Sigma Phi Epsilon'
  if (handle_lower.includes('sae')) return 'Sigma Alpha Epsilon'
  if (handle_lower.includes('taueps') || handle_lower.includes('tep')) return 'Tau Epsilon Phi'

  // Default: use handle as-is
  return handle
}

async function step2CreateChapters() {
  console.log('📝 Step 2: Create chapters for approved handles\n')

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

    // Chapters to create
    const toCreate = Object.entries(schoolInference).map(([handle, school_id]) => ({
      handle,
      school_id,
      fraternity: extractFraternity(handle)
    }))

    console.log(`Creating ${toCreate.length} new chapters...\n`)

    // Insert chapters
    const { data: inserted, error: insertError } = await supabase
      .from('chapters')
      .insert(toCreate.map(ch => ({
        ig_handle: ch.handle,
        school_id: ch.school_id,
        fraternity: ch.fraternity,
        stage: 'dm_sent',
        classification: 'active'
      })))
      .select('id, fraternity, school_id')

    if (insertError) {
      console.error('❌ Insert error:', insertError.message)
      process.exit(1)
    }

    console.log(`✅ Created ${inserted.length} chapters:\n`)

    // Get school names for display
    const schoolNames = {}
    for (const ch of inserted) {
      if (ch.school_id && !schoolNames[ch.school_id]) {
        const { data: school } = await supabase
          .from('schools')
          .select('name')
          .eq('id', ch.school_id)
          .single()
        schoolNames[ch.school_id] = school?.name || 'Unidentified'
      }
    }

    inserted.forEach(ch => {
      const schoolName = ch.school_id ? (schoolNames[ch.school_id] || 'Unidentified') : 'Unidentified'
      console.log(`  • ${ch.fraternity} @ ${schoolName}`)
    })

    // Now get the 67 chapters with no thread in export
    console.log('\n\n📋 Chapters with NO thread in export (67 total):\n')

    // Load messages to get all handles
    const messagesPath = path.join(process.cwd(), 'data', 'ig_messages_import.json')
    const messagesRaw = fs.readFileSync(messagesPath, 'utf8')
    const messages = JSON.parse(messagesRaw)

    const messageHandles = new Set(messages.map(m => m.handle))

    // Build normalized index of handles in messages
    const normalizedHandlesInMessages = new Set()
    messageHandles.forEach(handle => {
      const normalized = normalize(handle)
      normalizedHandlesInMessages.add(normalized)
    })

    // Get all chapters
    const { data: allChapters, error: allError } = await supabase
      .from('chapters')
      .select('id, fraternity, ig_handle, school_id')

    if (allError) {
      console.error('❌ Query error:', allError.message)
      process.exit(1)
    }

    // Get school names
    const allSchoolNames = {}
    const uniqueSchoolIds = new Set(allChapters.map(ch => ch.school_id).filter(Boolean))
    for (const schoolId of uniqueSchoolIds) {
      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single()
      allSchoolNames[schoolId] = school?.name || 'Unidentified'
    }

    // Find chapters with no thread
    const chaptersNoThread = allChapters.filter(ch => {
      if (!ch.ig_handle) return true // No IG handle at all
      const normalized = normalize(ch.ig_handle)
      return !normalizedHandlesInMessages.has(normalized)
    })

    console.log(`Found ${chaptersNoThread.length} chapters with no thread\n`)

    // Get communication counts for these chapters
    const { data: comms, error: commsError } = await supabase
      .from('communications')
      .select('chapter_id')

    if (commsError) {
      console.error('❌ Communications query error:', commsError.message)
      process.exit(1)
    }

    const commCounts = {}
    comms.forEach(c => {
      commCounts[c.chapter_id] = (commCounts[c.chapter_id] || 0) + 1
    })

    // List chapters
    console.log('chapter_id,fraternity,school,communications\n')
    chaptersNoThread
      .sort((a, b) => (commCounts[b.id] || 0) - (commCounts[a.id] || 0))
      .forEach(ch => {
        const count = commCounts[ch.id] || 0
        const schoolName = ch.school_id ? (allSchoolNames[ch.school_id] || 'N/A') : 'N/A'
        console.log(`"${ch.id}","${ch.fraternity}","${schoolName}",${count}`)
      })

    console.log(`\n✅ Step 2 complete.`)
    console.log(`   ${toCreate.length} chapters created`)
    console.log(`   ${chaptersNoThread.length} chapters have no thread in export (communications will be preserved)\n`)

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

step2CreateChapters()
