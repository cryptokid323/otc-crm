import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <span className="font-semibold">OTC Trips</span>
      {user && (
        <form action={signOut} className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button type="submit" className="border rounded px-3 py-1 text-sm">
            Sign out
          </button>
        </form>
      )}
    </header>
  )
}
