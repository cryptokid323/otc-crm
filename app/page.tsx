import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('fraternity, stage, ig_handle')
    .limit(10)

  if (error) return <pre>{error.message}</pre>

  return (
    <ul>
      {chapters.map((c) => (
        <li key={c.ig_handle}>{c.fraternity} — {c.stage} — {c.ig_handle}</li>
      ))}
    </ul>
  )
}