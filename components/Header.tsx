import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import SearchBox from './SearchBox'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b">
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="font-bold text-lg whitespace-nowrap">OTC Trips</Link>
        {user && (
          <>
            <SearchBox />
            <div className="flex items-center gap-6 ml-auto">
              <nav className="flex gap-4 text-sm whitespace-nowrap">
                <Link href="/" className="hover:text-blue-600">Today Queue</Link>
                <Link href="/pipeline" className="hover:text-blue-600">Pipeline</Link>
                <Link href="/recovery" className="hover:text-blue-600">Recovery</Link>
                <Link href="/schools" className="hover:text-blue-600">Schools</Link>
                <Link href="/scripts" className="hover:text-blue-600">Scripts</Link>
              </nav>
              <form action={signOut} className="flex items-center gap-3 pl-4 border-l">
                <span className="text-xs text-gray-600">{user.email}</span>
                <button type="submit" className="text-xs border rounded px-2 py-1">
                  Sign out
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
