import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChapterEditor from './ChapterEditor'
import TimelineAndForm from './TimelineAndForm'

export default async function ChapterDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch chapter details with school and rep
  const { data: chapter, error: chError } = await supabase
    .from('chapters')
    .select('*, schools(id, name, tier, region, verify_before_dm), reps:assigned_rep_id(id, name, email)')
    .eq('id', id)
    .single()

  if (chError || !chapter) {
    notFound()
  }

  // Fetch contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('chapter_id', id)
    .order('created_at', { ascending: false })

  // Fetch communications timeline
  const { data: communications } = await supabase
    .from('communications')
    .select('*')
    .eq('chapter_id', id)
    .order('created_at', { ascending: false })

  const school = chapter.schools
  const rep = Array.isArray(chapter.reps) ? chapter.reps[0] : chapter.reps

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header with school and verify warning */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{chapter.fraternity}</h1>
        {school && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{school.name}</span>
            {school.tier && <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">{school.tier}</span>}
            {school.region && <span>{school.region}</span>}
            {school.verify_before_dm === 'Yes' && (
              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">⚠ Verify before DM</span>
            )}
          </div>
        )}
      </div>

      {/* Timeline and Log Form - moved above fold */}
      <div className="mb-6">
        <TimelineAndForm
          chapterId={id}
          communications={communications || []}
          lastContact={chapter.last_contact}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editing area */}
        <div className="lg:col-span-2 space-y-6">
          <ChapterEditor chapter={chapter} />

          {/* Contacts Section */}
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Contacts</h2>
            {!contacts || contacts.length === 0 ? (
              <p className="text-gray-500 text-sm">No contacts</p>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact: any) => (
                  <div key={contact.id} className="border rounded p-3 bg-gray-50">
                    <div className="font-medium">{contact.name}</div>
                    {contact.role && <div className="text-sm text-gray-600">{contact.role}</div>}
                    {contact.phone && (
                      <div className="text-sm text-blue-600 font-mono">{contact.phone}</div>
                    )}
                    {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Quick Info */}
        <div className="space-y-4">
          {/* Assigned Rep */}
          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3 uppercase">Assigned Rep</h3>
            <div className="text-sm">
              <p className="font-medium">{rep?.name || 'Unassigned'}</p>
              {rep?.email && <p className="text-gray-600 text-xs">{rep.email}</p>}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3 uppercase">Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Stage</span>
                <p className="font-medium">{chapter.stage}</p>
              </div>
              <div>
                <span className="text-gray-600">Classification</span>
                <p className="font-medium">{chapter.classification}</p>
              </div>
              <div>
                <span className="text-gray-600">Bucket</span>
                <p className="font-medium">{chapter.bucket}</p>
              </div>
              <div>
                <span className="text-gray-600">IG Handle</span>
                <p className="font-medium">{chapter.ig_handle}</p>
              </div>
              <div>
                <span className="text-gray-600">Script Version</span>
                <p className="font-medium">{chapter.script_version || '—'}</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-sm mb-3 uppercase">Next Action</h3>
            <div className="text-sm">
              <p className="font-medium mb-1">{chapter.next_action || 'No action set'}</p>
              {chapter.next_action_date && (
                <p className="text-gray-600">{new Date(chapter.next_action_date).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
