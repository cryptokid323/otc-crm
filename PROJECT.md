# OTC Trips CRM — Project Documentation

## Overview

Full-stack CRM web application for managing fraternity chapter outreach, built with Next.js 16 + Supabase + Tailwind CSS. Designed for sales reps using mobile and desktop browsers. All data persists to live Supabase PostgreSQL database.

## Pages & Routes

### Authentication
- **`/login`** — Email/password sign-in form
  - Client component using Supabase Auth
  - Redirects authenticated users to home
  - Errors displayed inline

### Protected Routes (proxy-gated)
- **`/`** — TODAY QUEUE (home)
  - Lists chapters with overdue next actions (next_action_date ≤ today, classification = 'active')
  - Sorted by urgency (oldest first)
  - Table columns: Fraternity, IG handle, Stage, Bucket, Next Action, Days Overdue, Action buttons
  - Server-rendered with real Supabase data

- **`/pipeline`** — PIPELINE by Stage
  - Groups all chapters by stage
  - Shows chapter count per stage
  - Filters: Active/Inactive classification checkboxes
  - Clickable chapter cards linking to detail pages
  - Server-rendered query

- **`/recovery`** — RECOVERY by Bucket
  - Client component with bucket tabs (state-based tab switching)
  - 6 bucket tabs: Recent 1-Touch, Stalled Reply, Phone Handoff, Followup Pending, Qualified Handoff, Not Contacted
  - Each tab loads chapters for that bucket via client-side query
  - Shows next action and dates

- **`/scripts`** — SCRIPTS Performance
  - Script funnel view: sent, replies, reply_rate per script version
  - Server-rendered table (script_funnel view — ready to be created in database)
  - Graceful error handling if view doesn't exist

- **`/chapters/[id]`** — CHAPTER DETAIL
  - Server-rendered chapter fetcher + layout
  - ChapterEditor client component (editable fields)
  - Sidebar: Details panel (stage, classification, bucket, IG handle, script version)
  - Sidebar: Next Action panel (quick view)
  - Contacts section (fetched server-side, displays with phone/email/role)
  - Communications Timeline section (fetched server-side, sorted by date descending)
  - All edits via client-side mutation (ChapterEditor)

## File Structure

```
/app
  /login
    page.tsx                 # Login form (client)
  /pipeline
    page.tsx                 # Pipeline view (server)
  /recovery
    page.tsx                 # Recovery buckets (client)
  /scripts
    page.tsx                 # Scripts performance (server)
  /chapters/[id]
    page.tsx                 # Chapter detail (server)
    ChapterEditor.tsx        # Editable chapter form (client)
  page.tsx                   # TODAY QUEUE (server)
  layout.tsx                 # Root layout with Header

/components
  Header.tsx                 # Navigation + sign-out (server)

/lib/supabase
  server.ts                  # Server-side Supabase client (cookie-based sessions)
  client.ts                  # Browser-side Supabase client
  middleware.ts              # Proxy session refresh logic

/app/actions
  auth.ts                    # Server action: signOut()

/db
  schema-notes.md            # Database schema documentation

/
  proxy.ts                   # Auth route protection (replaces deprecated middleware.ts)
  .env.local                 # Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

/public
  (Tailwind CSS, Next.js defaults)
```

## Supabase Auth Patterns

### Route Protection
**File:** `proxy.ts` (Next.js 16 convention, replaces deprecated `middleware.js`)

- Runs on every request (except static assets, images)
- Calls `updateSession()` from `lib/supabase/middleware.ts`
- Middleware refreshes session via Supabase Auth on each request
- Redirects:
  - Unauthenticated users to `/login`
  - Authenticated users away from `/login` back to `/`

### Server-Side Client
**File:** `lib/supabase/server.ts`

```typescript
const supabase = await createClient()
const { data, error } = await supabase.from('chapters').select(...)
```

**Usage:**
- Server components (page.tsx)
- Server actions (auth.ts)
- Cookie-based session management (reads/writes from `cookies()`)
- Automatically sends auth token from session cookie

### Client-Side Client
**File:** `lib/supabase/client.ts`

```typescript
const supabase = createClient()
const { data, error } = await supabase.from('chapters').update(...).eq('id', chapterId)
```

**Usage:**
- Client components (marked with 'use client')
- Form submissions, edits, mutations
- React state management

### Session Refresh
**File:** `lib/supabase/middleware.ts`

- Runs on every proxy request
- Calls `supabase.auth.getUser()` to refresh session
- Automatically updates session cookies if expired
- Users stay logged in seamlessly

## Database Schema

### Tables

**chapters**
- `id` (uuid, pk)
- `fraternity` (text)
- `ig_handle` (text)
- `stage` (text, CHECK constraint — 16 possible values)
- `classification` (text, CHECK constraint)
- `bucket` (text, CHECK constraint — one of 6 values)
- `script_version` (text)
- `next_action` (text)
- `next_action_date` (date)
- `notes` (text)
- `rep_id` (uuid, fk → reps)
- `created_at`, `updated_at` (timestamps)

**contacts**
- `id` (uuid, pk)
- `chapter_id` (uuid, fk → chapters)
- `name` (text)
- `phone` (text)
- `email` (text)
- `role` (text)
- `created_at` (timestamp)

**communications**
- `id` (uuid, pk)
- `chapter_id` (uuid, fk → chapters)
- `type` (text) — 'call', 'email', 'text', 'meeting', etc.
- `subject` (text)
- `notes` (text)
- `created_at` (timestamp)
- `created_by` (uuid, fk → reps)

**scripts**
- `id` (uuid, pk)
- `version` (text)
- `name` (text)
- `content` (text)
- `created_at` (timestamp)

**reps**
- `id` (uuid, pk)
- `email` (text)
- `name` (text)
- `created_at` (timestamp)

**script_funnel** (VIEW — needs to be created)
- `script_version` (text)
- `sent` (integer)
- `replies` (integer)
- `reply_rate` (numeric)

### Enum/Check Constraint Values

**stage** (16 values)
- `dm_sent`
- `responded`
- `phone`
- (13 others — full list to be confirmed from database)

**classification** (multiple values)
- `active`
- (others TBD)

**bucket** (6 values)
- `recent_one_touch`
- `stalled_reply`
- `phone_handoff`
- `followup_pending`
- `qualified_handoff`
- `not_contacted`

## Row-Level Security (RLS)

- Temporary anon read policy on `chapters` table (for testing)
- All writes use authenticated user session
- Auth middleware ensures only authenticated users reach protected routes

## Development

```bash
npm run dev
# Runs on http://localhost:3000
# Hot-reload on file changes
```

## Key Design Decisions

1. **Proxy over Middleware** — Next.js 16 deprecates `middleware.js` in favor of `proxy.js` for route protection and session management
2. **Server-first architecture** — Server components fetch data, client components handle mutations only
3. **No client-side state management** — React state only for form UX (ChapterEditor); Supabase is source of truth
4. **Cookie-based sessions** — Supabase Auth with httpOnly cookies prevents XSS attacks
5. **Dense, mobile-first UI** — Tailwind CSS with compact tables and cards for sales rep workflows
6. **Incremental builds** — Each page tested with real data before advancing

## Next Steps

- Create `script_funnel` view in Supabase SQL Editor
- Implement "Done" button and "Set Next" modal on TODAY QUEUE
- Add contact/communication creation UI
- Implement rep filter on Pipeline and Recovery pages
- Add search/filter on chapter names and stages

## Deployment

- Deploy to Vercel (native Next.js support)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase dashboard)
- All auth and data queries work seamlessly in production
