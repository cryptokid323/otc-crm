'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  id: string
  fraternity: string
  ig_handle: string
  school_id: string
}

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsSearching(true)
    const searchTerm = query.toLowerCase()

    const search = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('chapters')
          .select('id, fraternity, ig_handle, school_id')
          .or(`fraternity.ilike.%${searchTerm}%,ig_handle.ilike.%${searchTerm}%,school_id.ilike.%${searchTerm}%`)
          .limit(8)

        setResults(data || [])
        setIsOpen(true)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }

    const timer = setTimeout(search, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md">
      <input
        type="text"
        placeholder="Search chapters..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setIsOpen(true)}
        className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {isOpen && (query.trim() || isSearching) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={`/chapters/${result.id}`}
                  className="block px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0"
                  onClick={() => {
                    setQuery('')
                    setIsOpen(false)
                  }}
                >
                  <div className="font-medium">{result.fraternity}</div>
                  <div className="text-xs text-gray-600">
                    {result.ig_handle && <span>{result.ig_handle} </span>}
                    {result.school_id && <span>· {result.school_id}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}
