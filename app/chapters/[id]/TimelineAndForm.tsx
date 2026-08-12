'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CHANNEL_OPTIONS = ['instagram', 'email', 'text', 'call', 'other'] as const
const DIRECTION_OPTIONS = ['in', 'out'] as const

export default function TimelineAndForm({
  chapterId,
  communications: initialComms,
  lastContact,
}: {
  chapterId: string
  communications: any[]
  lastContact?: string
}) {
  const [communications, setCommunications] = useState(initialComms)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    channel: 'instagram' as (typeof CHANNEL_OPTIONS)[number],
    direction: 'in' as (typeof DIRECTION_OPTIONS)[number],
    sent_on: new Date().toISOString().split('T')[0],
    body: '',
  })

  const handleSaveMessage = async () => {
    if (!formData.body.trim()) {
      setError('Message body is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: newComm, error: saveError } = await supabase
        .from('communications')
        .insert({
          chapter_id: chapterId,
          channel: formData.channel,
          direction: formData.direction,
          sent_on: formData.sent_on,
          body: formData.body,
          contact_id: null,
        })
        .select()

      if (saveError) throw saveError

      // Update last_contact date on the chapter
      await supabase
        .from('chapters')
        .update({
          last_contact: formData.sent_on,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapterId)

      // Add to local state
      if (newComm && newComm.length > 0) {
        setCommunications([newComm[0], ...communications])
      }

      // Reset form
      setFormData({
        channel: 'instagram',
        direction: 'in',
        sent_on: new Date().toISOString().split('T')[0],
        body: '',
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMessage = async (commId: string) => {
    if (!confirm('Delete this message?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', commId)

      if (error) throw error

      // Remove from local state
      setCommunications(communications.filter(c => c.id !== commId))
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">Communication Timeline</h2>

      {/* Timeline */}
      <div className="mb-6 pb-6 border-b">
        {communications.length === 0 ? (
          <p className="text-gray-500 text-sm">No communications logged</p>
        ) : (
          <div className="space-y-4">
            {communications.map((comm: any) => (
              <div key={comm.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      comm.direction === 'in'
                        ? 'bg-blue-600'
                        : 'bg-green-600'
                    }`}
                  />
                  <div className="w-0.5 h-12 bg-gray-200 mt-1" />
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          comm.direction === 'in'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {comm.direction === 'in' ? '← Inbound' : '→ Outbound'}
                      </span>
                      <span className="text-xs text-gray-500 font-mono uppercase">
                        {comm.channel}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(comm.sent_on).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(comm.id)}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline font-medium flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 break-words">{comm.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Message Form */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-sm mb-4">Log a Message</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1">Channel</label>
            <select
              value={formData.channel}
              onChange={(e) =>
                setFormData({ ...formData, channel: e.target.value as any })
              }
              className="w-full border rounded px-2 py-1 text-xs"
            >
              {CHANNEL_OPTIONS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch.charAt(0).toUpperCase() + ch.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Direction</label>
            <select
              value={formData.direction}
              onChange={(e) =>
                setFormData({ ...formData, direction: e.target.value as any })
              }
              className="w-full border rounded px-2 py-1 text-xs"
            >
              <option value="in">Inbound</option>
              <option value="out">Outbound</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Date</label>
            <input
              type="date"
              value={formData.sent_on}
              onChange={(e) =>
                setFormData({ ...formData, sent_on: e.target.value })
              }
              className="w-full border rounded px-2 py-1 text-xs"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium mb-1">Message</label>
          <textarea
            value={formData.body}
            onChange={(e) =>
              setFormData({ ...formData, body: e.target.value })
            }
            placeholder="Enter message content..."
            rows={3}
            className="w-full border rounded px-2 py-1 text-xs"
          />
        </div>

        <button
          onClick={handleSaveMessage}
          disabled={saving}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Log Message'}
        </button>
      </div>
    </div>
  )
}
