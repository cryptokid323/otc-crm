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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

await supabase.auth.signInWithPassword({
  email: env.TEST_EMAIL,
  password: env.TEST_PASSWORD,
})

const { data } = await supabase
  .from('chapters')
  .select('id, fraternity, ig_handle, next_action, next_action_type')
  .ilike('ig_handle', '%pikapp%')

console.log('Found pikapp chapters:')
console.log(JSON.stringify(data, null, 2))
