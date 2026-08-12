import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PHASES, PHASE_STAGES, STAGE_LABELS, NEXT_ACTION_TYPE_LABELS, NEXT_ACTION_TYPE_COLORS } from '@/lib/constants'

export default async function Pipeline() {
  const supabase = await createClient()

  // Get all chapters grouped by stage
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, fraternity, stage, classification, next_action_type')
    .order('stage, fraternity')

  if (error) {
    return <div className="p-6 text-red-600">Error loading pipeline: {error.message}</div>
  }

  // Group by stage first
  const grouped: Record<string, any[]> = {}

  chapters?.forEach((ch: any) => {
    if (!grouped[ch.stage]) grouped[ch.stage] = []
    grouped[ch.stage].push(ch)
  })

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {PHASES.map((phase) => {
            const stagesInPhase = PHASE_STAGES[phase] || []
            const phaseChapters = stagesInPhase.flatMap(stage => grouped[stage] || [])
            const showing = phaseChapters.slice(0, 5)
            const remaining = phaseChapters.length - showing.length

            return (
              <div key={phase} className="border rounded-lg p-4 bg-gray-50">
                <h2 className="font-bold text-base mb-2">{phase}</h2>
                <p className="text-sm text-gray-600 mb-3">
                  {phaseChapters.length} chapter{phaseChapters.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {showing.map((ch: any) => (
                    <Link
                      key={ch.id}
                      href={`/chapters/${ch.id}`}
                      className="block p-2 bg-white rounded hover:bg-blue-50 border text-sm"
                    >
                      <div className="font-medium">{ch.fraternity}</div>
                      <div className="text-gray-500 text-xs mt-1">
                        {STAGE_LABELS[ch.stage] || ch.stage}
                      </div>
                      {ch.next_action_type && (
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            NEXT_ACTION_TYPE_COLORS[ch.next_action_type] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {NEXT_ACTION_TYPE_LABELS[ch.next_action_type] || ch.next_action_type}
                          </span>
                        </div>
                      )}
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
                  {remaining > 0 && (
                    <Link
                      href={`/pipeline?phase=${encodeURIComponent(phase)}`}
                      className="block p-2 text-center text-blue-600 hover:bg-blue-50 border rounded text-sm font-medium"
                    >
                      View all {remaining} chapters
                    </Link>
                  )}
                </div>
              </div>
            )
        })}
      </div>
    </div>
  )
}
