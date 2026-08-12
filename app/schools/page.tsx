'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type School = {
  id: string
  name: string
  state: string
  region: string
  tier: string | null
  outreach_track: string | null
  greek_rank: string | null
  prospect_status: string | null
  verify_before_dm: boolean | null
  assigned_rep_id: string | null
  assigned_rep?: { name: string }
  chapters_count?: number
  last_contact?: string
  chapters?: Array<{ phase: string }>
}

export default function SchoolsPage() {
  const [activeTab, setActiveTab] = useState<'untouched' | 'contacted'>('untouched')
  const [untouched, setUntouched] = useState<School[]>([])
  const [contacted, setContacted] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'rank' | 'name'>('rank')
  const [filterTier, setFilterTier] = useState<string>('')
  const [filterRegion, setFilterRegion] = useState<string>('')
  const [filterTrack, setFilterTrack] = useState<string>('')

  useEffect(() => {
    const fetchSchools = async () => {
      const supabase = createClient()

      // Fetch untouched schools (tier is not empty string)
      const { data: untouchedData } = await supabase
        .from('schools')
        .select('*, assigned_rep:reps(name)')
        .neq('tier', '')

      // Fetch contacted schools (have chapters) - all schools, then filter by chapter presence
      const { data: allSchoolsWithChapters } = await supabase
        .from('schools')
        .select(`
          *,
          assigned_rep:reps(name),
          chapters(id, stage, next_action_date)
        `)

      // Filter to only schools that have chapters
      const contactedData = allSchoolsWithChapters?.filter(s => s.chapters && s.chapters.length > 0) || []

      if (untouchedData) {
        setUntouched(untouchedData as School[])
      }

      if (contactedData) {
        const enriched = contactedData.map((s: any) => ({
          ...s,
          chapters_count: s.chapters?.length || 0,
          last_contact: s.chapters
            ?.map((c: any) => c.next_action_date)
            .sort()
            .pop(),
        }))
        setContacted(enriched as School[])
      }

      setLoading(false)
    }

    fetchSchools()
  }, [])

  const filteredUntouched = untouched
    .filter(s => !filterTier || s.tier === filterTier)
    .filter(s => !filterRegion || s.region === filterRegion)
    .filter(s => !filterTrack || s.outreach_track === filterTrack)
    .sort((a, b) => {
      if (sortBy === 'rank') {
        return (parseInt(a.greek_rank || '999') || 999) - (parseInt(b.greek_rank || '999') || 999)
      }
      return (a.name || '').localeCompare(b.name || '')
    })

  const tiers = [...new Set(untouched.map(s => s.tier).filter((t): t is string => !!t))]
  const regions = [...new Set(untouched.map(s => s.region).filter((r): r is string => !!r))]
  const tracks = [...new Set(untouched.map(s => s.outreach_track).filter((t): t is string => !!t))]

  if (loading) {
    return <div className="p-6">Loading schools...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">School Coverage</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('untouched')}
          className={`px-4 py-2 font-semibold border-b-2 transition ${
            activeTab === 'untouched'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Untouched ({untouched.length})
        </button>
        <button
          onClick={() => setActiveTab('contacted')}
          className={`px-4 py-2 font-semibold border-b-2 transition ${
            activeTab === 'contacted'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Contacted ({contacted.length})
        </button>
      </div>

      {/* Untouched Tab */}
      {activeTab === 'untouched' && (
        <div>
          {/* Filters */}
          <div className="mb-4 flex gap-4 flex-wrap">
            <div>
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rank' | 'name')}
                className="ml-2 px-2 py-1 border rounded text-sm"
              >
                <option value="rank">Rank</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Tier:</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="ml-2 px-2 py-1 border rounded text-sm"
              >
                <option value="">All</option>
                {tiers.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Region:</label>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="ml-2 px-2 py-1 border rounded text-sm"
              >
                <option value="">All</option>
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Track:</label>
              <select
                value={filterTrack}
                onChange={(e) => setFilterTrack(e.target.value)}
                className="ml-2 px-2 py-1 border rounded text-sm"
              >
                <option value="">All</option>
                {tracks.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2 font-semibold">Rank</th>
                  <th className="text-left px-3 py-2 font-semibold">School</th>
                  <th className="text-left px-3 py-2 font-semibold">State</th>
                  <th className="text-left px-3 py-2 font-semibold">Region</th>
                  <th className="text-left px-3 py-2 font-semibold">Track</th>
                  <th className="text-left px-3 py-2 font-semibold">Assigned Rep</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUntouched.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-2 text-center text-gray-500">
                      No schools match filters
                    </td>
                  </tr>
                ) : (
                  filteredUntouched.map((school) => (
                    <tr key={school.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-medium">{school.greek_rank || '—'}</td>
                      <td className="px-3 py-2 font-medium">
                        <Link
                          href={`/schools/${school.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {school.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{school.state}</td>
                      <td className="px-3 py-2 text-sm">{school.region}</td>
                      <td className="px-3 py-2 text-sm">{school.outreach_track || '—'}</td>
                      <td className="px-3 py-2 text-sm">
                        {school.assigned_rep?.name || '—'}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          {school.prospect_status || 'New'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contacted Tab */}
      {activeTab === 'contacted' && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2 font-semibold">School</th>
                  <th className="text-left px-3 py-2 font-semibold">State</th>
                  <th className="text-left px-3 py-2 font-semibold">Chapters</th>
                  <th className="text-left px-3 py-2 font-semibold">Last Contact</th>
                  <th className="text-left px-3 py-2 font-semibold">Assigned Rep</th>
                </tr>
              </thead>
              <tbody>
                {contacted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-500">
                      No contacted schools
                    </td>
                  </tr>
                ) : (
                  contacted.map((school) => (
                    <tr key={school.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">
                        <Link
                          href={`/schools/${school.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {school.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{school.state}</td>
                      <td className="px-3 py-2 text-sm">{school.chapters_count}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {school.last_contact
                          ? new Date(school.last_contact).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {school.assigned_rep?.name || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
