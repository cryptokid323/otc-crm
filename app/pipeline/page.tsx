import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Pipeline() {
  const supabase = await createClient()

  // Get all chapters grouped by stage
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, fraternity, stage, classification')
    .order('stage, fraternity')

  if (error) {
    return <div className="p-6 text-red-600">Error loading pipeline: {error.message}</div>
  }

  // Group by stage
  const grouped: Record<string, any[]> = {}
  chapters?.forEach((ch: any) => {
    if (!grouped[ch.stage]) grouped[ch.stage] = []
    grouped[ch.stage].push(ch)
  })

  const stages = Object.keys(grouped).sort()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pipeline</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked className="rounded" />
          <span>Active</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="rounded" />
          <span>Inactive</span>
        </label>
      </div>

      {stages.length === 0 ? (
        <p className="text-gray-500">No chapters in pipeline</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <div key={stage} className="border rounded-lg p-4 bg-gray-50">
              <h2 className="font-bold text-lg mb-2">{stage}</h2>
              <p className="text-sm text-gray-600 mb-3">
                {grouped[stage].length} chapter{grouped[stage].length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {grouped[stage].map((ch: any) => (
                  <Link
                    key={ch.id}
                    href={`/chapters/${ch.id}`}
                    className="block p-2 bg-white rounded hover:bg-blue-50 border text-sm"
                  >
                    <div className="font-medium">{ch.fraternity}</div>
                    {ch.classification && (
                      <div className="text-gray-500 text-xs mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                          ch.classification === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ch.classification}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
