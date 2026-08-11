'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Recovery() {
  const [bucket, setBucket] = useState<string>('recent_one_touch')
  const [chapters, setChapters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bucketConfig = [
    { key: 'recent_one_touch', label: 'Recent 1-Touch' },
    { key: 'stalled_reply', label: 'Stalled Reply' },
    { key: 'phone_handoff', label: 'Phone Handoff' },
    { key: 'followup_pending', label: 'Followup Pending' },
    { key: 'qualified_handoff', label: 'Qualified Handoff' },
    { key: 'not_contacted', label: 'Not Contacted' },
  ]

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('chapters')
          .select('id, fraternity, stage, bucket, next_action, next_action_date')
          .eq('bucket', bucket)
          .order('next_action_date', { ascending: true })

        if (err) throw err
        setChapters(data || [])
        setError(null)
      } catch (e: any) {
        setError(e.message)
        setChapters([])
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetch()
  }, [bucket])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Recovery</h1>

      <div className="flex gap-2 mb-6 border-b overflow-x-auto">
        {bucketConfig.map((b) => (
          <button
            key={b.key}
            onClick={() => setBucket(b.key)}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
              bucket === b.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-red-600">Error: {error}</p>
      ) : chapters.length === 0 ? (
        <p className="text-gray-500">No chapters in this bucket</p>
      ) : (
        <div className="space-y-3">
          {chapters.map((ch: any) => (
            <Link
              key={ch.id}
              href={`/chapters/${ch.id}`}
              className="block border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{ch.fraternity}</h3>
                  <p className="text-sm text-gray-600">{ch.school}</p>
                  <p className="text-sm text-gray-700 mt-1">{ch.next_action}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{ch.stage}</p>
                  <p className="text-gray-600 text-xs mt-1">{ch.next_action_date}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
