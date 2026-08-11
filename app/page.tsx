import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function TodayQueue() {
  const supabase = await createClient()

  // Get chapters with overdue actions (next_action_date <= today, classification = 'active')
  const today = new Date().toISOString().split('T')[0]

  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, fraternity, ig_handle, stage, bucket, next_action, next_action_date, classification, school_id')
    .eq('classification', 'active')
    .lte('next_action_date', today)
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
      <h1 className="text-2xl font-bold mb-4">Today Queue</h1>

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
                <th className="text-left px-3 py-2 font-semibold">Bucket</th>
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
                  <td className="px-3 py-2 text-sm text-gray-600">{ch.school_id || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{ch.ig_handle}</td>
                  <td className="px-3 py-2 text-sm">{ch.stage}</td>
                  <td className="px-3 py-2 text-sm">{ch.bucket}</td>
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