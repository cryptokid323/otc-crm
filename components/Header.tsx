import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-bold text-lg">OTC Trips</Link>
        {user && (
          <div className="flex items-center gap-6">
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-blue-600">Today Queue</Link>
              <Link href="/pipeline" className="hover:text-blue-600">Pipeline</Link>
              <Link href="/recovery" className="hover:text-blue-600">Recovery</Link>
              <Link href="/scripts" className="hover:text-blue-600">Scripts</Link>
            </nav>
            <form action={signOut} className="flex items-center gap-3 ml-4 pl-4 border-l">
              <span className="text-xs text-gray-600">{user.email}</span>
              <button type="submit" className="text-xs border rounded px-2 py-1">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}
