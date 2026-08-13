import { createClient } from '@/lib/supabase/server'

// Detect script from outbound message body
function detectScript(body: string): string {
  if (!body) return 'Custom'

  const lowerBody = body.toLowerCase()

  // Script A: "schedule a meeting with the President"
  if (lowerBody.includes('schedule a meeting with the president')) {
    return 'A'
  }

  // Script B: "founders of OTC Trips"
  if (lowerBody.includes('founders of otc trips')) {
    return 'B'
  }

  // Script R: "sent me your number"
  if (lowerBody.includes('sent me your number')) {
    return 'R'
  }

  return 'Custom'
}

export default async function Scripts() {
  const supabase = await createClient()

  // Get all outbound communications
  const { data: outbound } = await supabase
    .from('communications')
    .select('chapter_id, sent_on, body')
    .eq('direction', 'out')

  // Get all inbound communications
  const { data: inbound } = await supabase
    .from('communications')
    .select('chapter_id, sent_on')
    .eq('direction', 'in')

  // Build earliest inbound per chapter
  const firstInboundByChapter: Record<string, string> = {}
  inbound?.forEach((msg: any) => {
    if (!firstInboundByChapter[msg.chapter_id] || msg.sent_on < firstInboundByChapter[msg.chapter_id]) {
      firstInboundByChapter[msg.chapter_id] = msg.sent_on
    }
  })

  // Count sends and replies per script
  const scriptStats: Record<string, { sent: number; chaptersWithReplies: Set<string> }> = {
    A: { sent: 0, chaptersWithReplies: new Set() },
    B: { sent: 0, chaptersWithReplies: new Set() },
    R: { sent: 0, chaptersWithReplies: new Set() },
    Custom: { sent: 0, chaptersWithReplies: new Set() },
  }

  // Process each outbound message
  outbound?.forEach((msg: any) => {
    const script = detectScript(msg.body)
    scriptStats[script].sent += 1

    // Check if chapter has inbound after this outbound
    const firstInbound = firstInboundByChapter[msg.chapter_id]
    if (firstInbound && firstInbound >= msg.sent_on) {
      scriptStats[script].chaptersWithReplies.add(msg.chapter_id)
    }
  })

  const funnel = Object.entries(scriptStats)
    .map(([script, data]) => ({
      script_version: script,
      sent: data.sent,
      replies: data.chaptersWithReplies.size,
      reply_rate: data.sent > 0 ? data.chaptersWithReplies.size / data.sent : 0,
    }))
    .sort((a, b) => {
      // Sort: A, B, R, Custom
      const order: Record<string, number> = { A: 0, B: 1, R: 2, Custom: 3 }
      return (order[a.script_version] || 999) - (order[b.script_version] || 999)
    })

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
