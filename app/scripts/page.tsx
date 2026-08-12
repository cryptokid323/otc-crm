import { createClient } from '@/lib/supabase/server'

export default async function Scripts() {
  const supabase = await createClient()

  // Get chapters with script_version
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, script_version')

  // Count sent (chapters with script_version) and replies (communications with direction='in')
  const { data: scriptStats } = await supabase
    .from('chapters')
    .select('script_version')
    .not('script_version', 'is', null)

  const { data: replies } = await supabase
    .from('communications')
    .select('chapter_id, chapters(script_version)', { count: 'exact' })
    .eq('direction', 'in')

  // Build funnel data
  const funnelMap: Record<string, { sent: number; replies: number }> = {}

  // Count sent (chapters with each script_version)
  chapters?.forEach((ch: any) => {
    const version = ch.script_version || 'Unknown'
    if (!funnelMap[version]) funnelMap[version] = { sent: 0, replies: 0 }
    funnelMap[version].sent += 1
  })

  // Count replies (incoming communications grouped by chapter's script_version)
  replies?.forEach((r: any) => {
    const version = r.chapters?.script_version || 'Unknown'
    if (funnelMap[version]) {
      funnelMap[version].replies += 1
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
