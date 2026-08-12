'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NEXT_ACTION_TYPE_LABELS, NEXT_ACTION_TYPE_COLORS } from '@/lib/constants'

interface Chapter {
  id: string
  fraternity: string
  ig_handle: string
  stage: string
  bucket: string
  next_action: string
  next_action_type: string
  next_action_date: string
  schools?: any
  reps?: any
  last_contact?: string
  communications?: any[]
}

interface Rep {
  id: string
  name: string
  email?: string
}

export default function TodayQueueClient({
  chapters,
  reps,
}: {
  chapters: Chapter[]
  reps: Rep[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignRepId, setAssignRepId] = useState<string>('')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekAheadStr = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // Group chapters by urgency
  const overdue = chapters.filter((ch) => ch.next_action_date < todayStr)
  const dueToday = chapters.filter(
    (ch) => ch.next_action_date === todayStr
  )
  const thisWeek = chapters.filter(
    (ch) => ch.next_action_date > todayStr && ch.next_action_date <= weekAheadStr
  )

  const getLatestCommunication = (chapter: Chapter) => {
    if (!chapter.communications || chapter.communications.length === 0) {
      return null
    }
    return chapter.communications[0]
  }

  const toggleSelect = (chapterId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(chapterId)) {
      newSelected.delete(chapterId)
    } else {
      newSelected.add(chapterId)
    }
    setSelected(newSelected)
  }

  const handleBulkAssign = async () => {
    if (!assignRepId) {
      setError('Please select a rep')
      return
    }

    if (selected.size === 0) {
      setError('Please select at least one chapter')
      return
    }

    setAssigning(true)
    setError(null)

    try {
      const supabase = createClient()
      const selectedArray = Array.from(selected)

      // Update all selected chapters
      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          assigned_rep_id: assignRepId,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedArray)

      if (updateError) throw updateError

      // Refresh the page
      window.location.reload()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAssigning(false)
    }
  }

  const ChapterRow = ({ chapter }: { chapter: Chapter }) => {
    const rep = Array.isArray(chapter.reps)
      ? chapter.reps[0]
      : chapter.reps
    const lastComm = getLatestCommunication(chapter)
    const daysOverdue = Math.floor(
      (today.getTime() - new Date(chapter.next_action_date).getTime()) /
      (1000 * 60 * 60 * 24)
    )

    return (
      <div className="border-b py-3 px-3 hover:bg-gray-50 transition">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected.has(chapter.id)}
            onChange={() => toggleSelect(chapter.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/chapters/${chapter.id}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {chapter.fraternity}
              </Link>
              {chapter.schools?.tier && (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {chapter.schools.tier}
                </span>
              )}
              <span className="text-xs text-gray-600">
                {chapter.schools?.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              {chapter.next_action_type && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    NEXT_ACTION_TYPE_COLORS[chapter.next_action_type] ||
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {NEXT_ACTION_TYPE_LABELS[chapter.next_action_type]}
                </span>
              )}
              <span>{chapter.next_action}</span>
              {chapter.last_contact && (
                <span className="text-gray-500">
                  • Last: {new Date(chapter.last_contact).toLocaleDateString()}
                </span>
              )}
            </div>
            {lastComm && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                {lastComm.direction === 'in' ? '←' : '→'} {lastComm.channel} •{' '}
                {lastComm.body.slice(0, 90)}
                {lastComm.body.length > 90 ? '...' : ''}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            {rep && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                {rep.name}
              </span>
            )}
            {daysOverdue > 0 && (
              <span className="text-xs font-semibold text-red-600 w-12 text-right">
                {daysOverdue}d OD
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Bulk assign section */}
      {selected.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-4 justify-between">
            <span className="text-sm font-medium">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <select
                value={assignRepId}
                onChange={(e) => setAssignRepId(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">Select rep...</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={assigning || !assignRepId}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
          {error && (
            <div className="text-red-600 text-xs mt-2">{error}</div>
          )}
        </div>
      )}

      {/* OVERDUE Section */}
      {overdue.length > 0 && (
        <div className="mb-6 border rounded-lg overflow-hidden">
          <div className="bg-red-50 border-b px-3 py-2 font-semibold text-sm text-red-700">
            OVERDUE ({overdue.length})
          </div>
          {overdue.map((ch) => (
            <ChapterRow key={ch.id} chapter={ch} />
          ))}
        </div>
      )}

      {/* DUE TODAY Section */}
      {dueToday.length > 0 && (
        <div className="mb-6 border rounded-lg overflow-hidden">
          <div className="bg-amber-50 border-b px-3 py-2 font-semibold text-sm text-amber-700">
            DUE TODAY ({dueToday.length})
          </div>
          {dueToday.map((ch) => (
            <ChapterRow key={ch.id} chapter={ch} />
          ))}
        </div>
      )}

      {/* THIS WEEK Section */}
      {thisWeek.length > 0 && (
        <div className="mb-6 border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b px-3 py-2 font-semibold text-sm text-gray-700">
            THIS WEEK ({thisWeek.length})
          </div>
          {thisWeek.map((ch) => (
            <ChapterRow key={ch.id} chapter={ch} />
          ))}
        </div>
      )}
    </div>
  )
}
