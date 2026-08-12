import { createClient } from '@/lib/supabase/server'

export default async function Scripts() {
  const supabase = await createClient()

  // Get all chapters grouped by script_version
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, script_version')

  // Get all communications to count replies
  const { data: communications } = await supabase
    .from('communications')
    .select('chapter_id, type, direction')

  // Build funnel data
  const funnelMap: Record<string, { sent: number; replies: number }> = {}

  chapters?.forEach((ch: any) => {
    const version = ch.script_version || 'Unknown'
    if (!funnelMap[version]) funnelMap[version] = { sent: 0, replies: 0 }
    funnelMap[version].sent += 1
  })

  communications?.forEach((comm: any) => {
    const chapter = chapters?.find((ch: any) => ch.id === comm.chapter_id)
    if (chapter) {
      const version = chapter.script_version || 'Unknown'
      // Count communications where direction='in' (incoming/reply)
      if (funnelMap[version] && comm.direction === 'in') {
        funnelMap[version].replies += 1
      }
    }
  })

  const funnel = Object.entries(funnelMap)
    .map(([script_version, data]) => ({
      script_version,
      sent: data.sent,
      replies: data.replies,
      reply_rate: data.sent > 0 ? data.replies / data.sent : 0,
    }))
    .sort((a, b) => a.script_version.localeCompare(b.script_version))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Scripts</h1>

      {funnel.length === 0 ? (
        <p className="text-gray-500">No script data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold">Script Version</th>
                <th className="text-center px-3 py-2 font-semibold">Sent</th>
                <th className="text-center px-3 py-2 font-semibold">Replies</th>
                <th className="text-center px-3 py-2 font-semibold">Reply Rate</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((row: any) => (
                <tr key={row.script_version} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{row.script_version}</td>
                  <td className="px-3 py-2 text-center">{row.sent || 0}</td>
                  <td className="px-3 py-2 text-center">{row.replies || 0}</td>
                  <td className="px-3 py-2 text-center font-semibold">
                    {row.reply_rate ? `${(row.reply_rate * 100).toFixed(1)}%` : '—'}
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
