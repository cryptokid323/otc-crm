'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NEXT_ACTION_TYPE_LABELS, NEXT_ACTION_TYPE_COLORS } from '@/lib/constants'

export default function Recovery() {
  const [bucket, setBucket] = useState<string>('recent_one_touch')
  const [chapters, setChapters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bucketConfig = [
    { key: 'recent_one_touch', label: 'Recent 1-Touch' },
    { key: 'stale_one_touch', label: 'Stale 1-Touch' },
    { key: 'stalled_reply', label: 'Stalled Reply' },
    { key: 'phone_handoff', label: 'Phone Handoff' },
    { key: 'missed_warm', label: 'Missed Warm' },
    { key: 'blocked', label: 'Blocked' },
  ]

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('chapters')
          .select('id, fraternity, schools(name), stage, bucket, next_action, next_action_type, next_action_date')
          .eq('bucket', bucket)
          .order('next_action_date', { ascending: true })

        if (err) throw err

        // For phone_handoff, fetch contact phone numbers
        if (bucket === 'phone_handoff' && data) {
          const chaptersWithPhones = await Promise.all(
            data.map(async (ch: any) => {
              const { data: contact } = await supabase
                .from('contacts')
                .select('phone')
                .eq('chapter_id', ch.id)
                .limit(1)
                .single()

              return { ...ch, phone: contact?.phone }
            })
          )
          setChapters(chaptersWithPhones)
        } else {
          setChapters(data || [])
        }
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
                  <p className="text-sm text-gray-600">{ch.schools?.name}</p>
                  {ch.next_action_type && (
                    <p className="text-sm mt-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${NEXT_ACTION_TYPE_COLORS[ch.next_action_type] || 'bg-gray-100 text-gray-800'}`}>
                        {NEXT_ACTION_TYPE_LABELS[ch.next_action_type] || ch.next_action_type}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-gray-700 mt-1">{ch.next_action}</p>
                  {bucket === 'phone_handoff' && ch.phone && (
                    <p className="text-sm text-blue-600 font-mono mt-1">{ch.phone}</p>
                  )}
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
