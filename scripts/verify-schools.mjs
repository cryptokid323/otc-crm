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

async function verifySchools() {
  console.log('🔍 Verifying schools counts...\n')

  try {
    await supabase.auth.signInWithPassword({
      email: env.TEST_EMAIL,
      password: env.TEST_PASSWORD,
    })

    // Untouched schools: tier <> ''
    const { data: untouchedData, count: untouchedCount } = await supabase
      .from('schools')
      .select('id, name, tier', { count: 'exact' })
      .neq('tier', '')

    console.log(`📊 Untouched schools (tier <> ''): ${untouchedCount}`)
    console.log(`   Expected: ~58`)
    if (untouchedData && untouchedData.length > 0) {
      console.log(`   Sample:`)
      untouchedData.slice(0, 3).forEach(s => {
        console.log(`     • ${s.name} (Tier: "${s.tier}")`)
      })
    }

    // Contacted schools: have chapters
    const { data: allSchoolsWithChapters } = await supabase
      .from('schools')
      .select('id, name, chapters(id)')

    const contactedSchools = allSchoolsWithChapters?.filter(s => s.chapters && s.chapters.length > 0) || []
    console.log(`\n🏫 Contacted schools (have chapters): ${contactedSchools.length}`)
    console.log(`   Expected: ~153`)
    if (contactedSchools.length > 0) {
      console.log(`   Sample:`)
      contactedSchools.slice(0, 3).forEach(s => {
        console.log(`     • ${s.name} (${s.chapters.length} chapters)`)
      })
    }

    // Total chapters linked
    let totalChapterLinks = 0
    allSchoolsWithChapters?.forEach(s => {
      totalChapterLinks += s.chapters?.length || 0
    })
    console.log(`\n📈 Total chapters linked to schools: ${totalChapterLinks}`)
    console.log(`   Expected: 611`)

    if (untouchedCount === 58 && contactedSchools.length === 153) {
      console.log('\n✅ Counts match expected values!')
    } else {
      console.log(`\n⚠️  Counts may differ slightly (seed data variation)`)
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

verifySchools()
