import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NEXT_ACTION_TYPE_LABELS, NEXT_ACTION_TYPE_COLORS, NEXT_ACTION_TYPES } from '@/lib/constants'
import TodayQueueClient from './TodayQueueClient'

export default async function TodayQueue({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const filterType = typeof params.type === 'string' ? params.type : undefined
  const showMyQueue = typeof params.my === 'string' ? params.my === 'true' : false

  const supabase = await createClient()

  // Get current user email to map to rep
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email

  // Get chapters with overdue actions, with school and rep info
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('chapters')
    .select(`
      id, fraternity, ig_handle, stage, bucket, next_action, next_action_type,
      next_action_date, classification, last_contact,
      schools(name, tier),
      reps:assigned_rep_id(id, name, email),
      communications:communications(channel, direction, sent_on, body, created_at)
    `)
    .eq('classification', 'active')
    .lte('next_action_date', today)

  if (filterType && NEXT_ACTION_TYPES.includes(filterType as any)) {
    query = query.eq('next_action_type', filterType)
  }

  const { data: chaptersData, error } = await query
    .order('next_action_date', { ascending: true })

  if (error) {
    return <div className="p-6 text-red-600">Error loading queue: {error.message}</div>
  }

  // Get all reps for the assign dropdown
  const { data: reps } = await supabase.from('reps').select('id, name, email')

  // Map email to rep (email column not yet available in reps table)
  // TODO: Once email column is added to reps table, implement email-based filtering
  let currentRep: any = null
  // if (userEmail && reps) {
  //   currentRep = reps.find((r: any) => r.email === userEmail)
  // }

  const chapters = chaptersData || []
  // For now, disable "My Queue" filter until email column is available
  const filteredChapters = false && currentRep
    ? chapters.filter((ch: any) => {
        const rep = Array.isArray(ch.reps) ? ch.reps[0] : ch.reps
        return rep?.id === currentRep.id
      })
    : chapters

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Today Queue</h1>
      </div>

      {/* Action Type Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/"
          className={`px-3 py-1 text-xs rounded border transition ${
            !filterType
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 text-gray-600 hover:border-gray-400'
          }`}
        >
          All
        </Link>
        {NEXT_ACTION_TYPES.map((type) => (
          <Link
            key={type}
            href={`/?type=${type}`}
            className={`px-3 py-1 text-xs rounded border transition ${
              filterType === type
                ? `${NEXT_ACTION_TYPE_COLORS[type]}`
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {NEXT_ACTION_TYPE_LABELS[type]}
          </Link>
        ))}
      </div>

      {filteredChapters.length === 0 ? (
        <p className="text-gray-500">No chapters need attention today</p>
      ) : (
        <TodayQueueClient
          chapters={filteredChapters}
          reps={reps || []}
        />
      )}
    </div>
  )
}