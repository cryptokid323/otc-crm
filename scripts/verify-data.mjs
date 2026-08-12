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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase env vars in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyData() {
  console.log('🔍 Verifying Supabase connection and data...\n')

  try {
    // Authenticate with test credentials
    const testEmail = env.TEST_EMAIL
    const testPassword = env.TEST_PASSWORD

    if (!testEmail || !testPassword) {
      console.error('❌ Missing TEST_EMAIL or TEST_PASSWORD in .env.local')
      process.exit(1)
    }

    console.log(`🔐 Signing in as ${testEmail}...`)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError.message)
      process.exit(1)
    }

    console.log('✓ Authenticated\n')

    // Check chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, fraternity, school_id')
      .limit(1)

    if (chaptersError) {
      console.error('❌ Chapters query error:', chaptersError.message)
      return
    }
    console.log('✓ Chapters table accessible')

    // Count chapters
    const { count: chapterCount } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })

    console.log(`  → Total chapters: ${chapterCount}`)

    // Check next_action_type column exists (will fail gracefully if not)
    try {
      const { data: chaptersWithType, error: typeError } = await supabase
        .from('chapters')
        .select('next_action_type')
        .not('next_action_type', 'is', null)
        .limit(1)

      if (typeError) {
        console.log('⚠ next_action_type column not yet added to chapters table')
      } else if (chaptersWithType && chaptersWithType.length > 0) {
        console.log('✓ next_action_type column populated')
      } else {
        console.log('⚠ next_action_type column exists but not yet populated')
      }
    } catch (e) {
      console.log('⚠ next_action_type column not yet added to chapters table')
    }

    // Check schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, state, region, tier')
      .limit(1)

    if (schoolsError) {
      console.error('❌ Schools query error:', schoolsError.message)
      return
    }
    console.log('✓ Schools table accessible')

    // Count schools
    const { count: schoolCount } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })

    console.log(`  → Total schools: ${schoolCount}`)

    // Count untouched schools (tier IS NOT NULL)
    const { count: untouchedCount } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .not('tier', 'is', null)

    console.log(`  → Untouched schools (tier ≠ null): ${untouchedCount}`)

    // Count contacted schools (tier IS NULL, have chapters)
    const { data: contactedSchools } = await supabase
      .from('schools')
      .select('id, chapters(id)')
      .is('tier', null)

    const contactedCount = contactedSchools?.filter(s => s.chapters && s.chapters.length > 0).length || 0
    console.log(`  → Contacted schools (have chapters): ${contactedCount}`)

    // Check school_id relationship
    const { data: chaptersWithSchool } = await supabase
      .from('chapters')
      .select('id, school_id')
      .not('school_id', 'is', null)
      .limit(1)

    if (chaptersWithSchool && chaptersWithSchool.length > 0) {
      console.log('✓ Chapters linked to schools via school_id')
    } else {
      console.log('⚠ No chapters have school_id linked')
    }

    // Check sample data
    console.log('\n📊 Sample data:')
    const { data: sampleChapter } = await supabase
      .from('chapters')
      .select('fraternity, next_action, schools(name)')
      .limit(1)

    if (sampleChapter && sampleChapter.length > 0) {
      const ch = sampleChapter[0]
      console.log(`  Chapter: ${ch.fraternity}`)
      console.log(`  School: ${ch.schools?.name || 'not linked'}`)
      console.log(`  Next Action: ${ch.next_action}`)
    }

    console.log('\n✅ Database verification complete!')
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

verifyData()
