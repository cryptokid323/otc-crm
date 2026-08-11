import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChapterEditor from './ChapterEditor'

export default async function ChapterDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch chapter details
  const { data: chapter, error: chError } = await supabase
    .from('chapters')
    .select('*')
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{chapter.fraternity}</h1>
        <p className="text-gray-600">{chapter.school}</p>
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

          {/* Communications Timeline */}
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Communications Timeline</h2>
            {!communications || communications.length === 0 ? (
              <p className="text-gray-500 text-sm">No communications logged</p>
            ) : (
              <div className="space-y-3">
                {communications.map((comm: any) => (
                  <div key={comm.id} className="border-l-2 border-gray-300 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold capitalize">{comm.type}</div>
                        {comm.subject && <div className="text-sm font-medium">{comm.subject}</div>}
                        {comm.notes && <div className="text-sm text-gray-700 mt-1">{comm.notes}</div>}
                      </div>
                      <div className="text-xs text-gray-600 text-right">
                        {new Date(comm.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Quick Info */}
        <div className="space-y-4">
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
                <p className="font-medium">@{chapter.ig_handle}</p>
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
