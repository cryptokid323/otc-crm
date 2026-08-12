import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NEXT_ACTION_TYPE_LABELS, NEXT_ACTION_TYPE_COLORS, NEXT_ACTION_TYPES } from '@/lib/constants'

export default async function TodayQueue({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const filterType = typeof params.type === 'string' ? params.type : undefined

  const supabase = await createClient()

  // Get chapters with overdue actions (next_action_date <= today, classification = 'active')
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('chapters')
    .select('id, fraternity, ig_handle, stage, bucket, next_action, next_action_type, next_action_date, classification, schools(name)')
    .eq('classification', 'active')
    .lte('next_action_date', today)

  if (filterType && NEXT_ACTION_TYPES.includes(filterType as any)) {
    query = query.eq('next_action_type', filterType)
  }

  const { data: chapters, error } = await query
    .order('next_action_date', { ascending: true })

  if (error) {
    return <div className="p-6 text-red-600">Error loading queue: {error.message}</div>
  }

  const daysOverdue = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

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

      {!chapters || chapters.length === 0 ? (
        <p className="text-gray-500">No chapters need attention today</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold">Fraternity</th>
                <th className="text-left px-3 py-2 font-semibold">School</th>
                <th className="text-left px-3 py-2 font-semibold">IG</th>
                <th className="text-left px-3 py-2 font-semibold">Stage</th>
                <th className="text-left px-3 py-2 font-semibold">Action Type</th>
                <th className="text-left px-3 py-2 font-semibold">Next Action</th>
                <th className="text-center px-3 py-2 font-semibold">Days OD</th>
                <th className="text-center px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((ch: any) => (
                <tr key={ch.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/chapters/${ch.id}`} className="text-blue-600 hover:underline">
                      {ch.fraternity}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{ch.schools?.name || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{ch.ig_handle}</td>
                  <td className="px-3 py-2 text-sm">{ch.stage}</td>
                  <td className="px-3 py-2 text-sm">
                    {ch.next_action_type && (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${NEXT_ACTION_TYPE_COLORS[ch.next_action_type] || 'bg-gray-100 text-gray-800'}`}>
                        {NEXT_ACTION_TYPE_LABELS[ch.next_action_type] || ch.next_action_type}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{ch.next_action}</td>
                  <td className="px-3 py-2 text-center font-semibold text-red-600">
                    {daysOverdue(ch.next_action_date)}
                  </td>
                  <td className="px-3 py-2 text-center space-x-2">
                    <button className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                      Done
                    </button>
                    <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                      Set Next
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}