import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { STAGE_LABELS, BUCKET_LABELS } from '@/lib/constants'

export default async function SchoolDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch school details
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single()

  if (schoolError || !school) {
    notFound()
  }

  // Fetch all chapters at this school
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('school_id', id)
    .order('created_at', { ascending: false })

  // Group chapters by stage
  const chaptersByStage: Record<string, any[]> = {}
  if (chapters) {
    chapters.forEach(ch => {
      if (!chaptersByStage[ch.stage]) {
        chaptersByStage[ch.stage] = []
      }
      chaptersByStage[ch.stage].push(ch)
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/schools" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Schools
        </Link>
        <h1 className="text-3xl font-bold mb-2">{school.name}</h1>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{school.state}</span>
          <span>•</span>
          <span>{school.region}</span>
          {school.tier && (
            <>
              <span>•</span>
              <span>Tier: {school.tier}</span>
            </>
          )}
        </div>
      </div>

      {/* School Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {school.outreach_track && (
          <div className="border rounded p-3">
            <div className="text-xs text-gray-600 mb-1">Outreach Track</div>
            <div className="font-semibold">{school.outreach_track}</div>
          </div>
        )}
        {school.greek_rank && (
          <div className="border rounded p-3">
            <div className="text-xs text-gray-600 mb-1">Greek Rank</div>
            <div className="font-semibold">#{school.greek_rank}</div>
          </div>
        )}
        {school.prospect_status && (
          <div className="border rounded p-3">
            <div className="text-xs text-gray-600 mb-1">Prospect Status</div>
            <div className="font-semibold">{school.prospect_status}</div>
          </div>
        )}
        <div className="border rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Chapters</div>
          <div className="font-semibold">{chapters?.length || 0}</div>
        </div>
      </div>

      {/* Chapters by Stage */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Chapters</h2>

        {!chapters || chapters.length === 0 ? (
          <p className="text-gray-500">No chapters at this school</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(chaptersByStage).map(([stage, stageChapters]: [string, any[]]) => (
              <div key={stage} className="border rounded-lg p-4">
                <h3 className="text-lg font-bold mb-4">
                  {STAGE_LABELS[stage] || stage} ({stageChapters?.length || 0})
                </h3>
                <div className="space-y-3">
                  {stageChapters?.map((ch: any) => (
                    <Link
                      key={ch.id}
                      href={`/chapters/${ch.id}`}
                      className="block border rounded p-3 hover:bg-blue-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-blue-600 hover:underline">
                            {ch.fraternity}
                          </div>
                          <div className="text-sm text-gray-600">@{ch.ig_handle}</div>
                          {ch.next_action && (
                            <div className="text-sm text-gray-700 mt-1">
                              <span className="font-medium">Next:</span> {ch.next_action}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-600 mb-1">
                            {ch.bucket && BUCKET_LABELS[ch.bucket]}
                          </div>
                          {ch.next_action_date && (
                            <div className="text-xs font-mono text-gray-500">
                              {new Date(ch.next_action_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
