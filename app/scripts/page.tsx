import { createClient } from '@/lib/supabase/server'

export default async function Scripts() {
  const supabase = await createClient()

  // Try to get script_funnel view data
  const { data: funnel, error } = await supabase
    .from('script_funnel')
    .select('script_version, sent, replies, reply_rate')
    .order('script_version')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Scripts</h1>

      {error ? (
        <div className="text-red-600 mb-4">Error loading scripts: {error.message}</div>
      ) : null}

      {!funnel || funnel.length === 0 ? (
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
