'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChapterEditor({ chapter }: { chapter: any }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    stage: chapter.stage || '',
    classification: chapter.classification || '',
    bucket: chapter.bucket || '',
    script_version: chapter.script_version || '',
    next_action: chapter.next_action || '',
    next_action_date: chapter.next_action_date || '',
    notes: chapter.notes || '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapter.id)

      if (updateError) throw updateError

      alert('Chapter updated successfully')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">Chapter Information</h2>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Stage</label>
          <input
            type="text"
            value={formData.stage}
            onChange={(e) => handleChange('stage', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Classification</label>
          <select
            value={formData.classification}
            onChange={(e) => handleChange('classification', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bucket</label>
          <select
            value={formData.bucket}
            onChange={(e) => handleChange('bucket', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {['1', '2', '3', '4', '5', '6'].map((b) => (
              <option key={b} value={b}>
                Bucket {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Script Version</label>
          <input
            type="text"
            value={formData.script_version}
            onChange={(e) => handleChange('script_version', e.target.value)}
            placeholder="e.g., v1.2"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Next Action</label>
        <input
          type="text"
          value={formData.next_action}
          onChange={(e) => handleChange('next_action', e.target.value)}
          placeholder="e.g., Follow up call"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Next Action Date</label>
        <input
          type="date"
          value={formData.next_action_date}
          onChange={(e) => handleChange('next_action_date', e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={4}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
