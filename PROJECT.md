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
  - Table columns: Fraternity, School, IG handle, Stage, Bucket, Next Action, Days Overdue, Action buttons
  - Server-rendered with real Supabase data

- **`/pipeline`** — PIPELINE by Stage
  - Shows all 16 stages in order (including empty stages)
  - Groups all chapters by stage
  - Shows chapter count per stage
  - Shows 10 most recent chapter cards per stage; "view all" link for remaining
  - Filters: Active/Inactive classification checkboxes
  - Clickable chapter cards linking to detail pages
  - Server-rendered query

- **`/recovery`** — RECOVERY by Bucket
  - Client component with bucket tabs (state-based tab switching)
  - 6 bucket tabs: Recent 1-Touch, Stale 1-Touch, Stalled Reply, Phone Handoff, Missed Warm, Blocked
  - Each tab loads chapters for that bucket via client-side query
  - Shows next action and dates
  - Card links to chapter detail
  - Phone number shown inline for phone_handoff bucket

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
  - Stage and Script Version are dropdown selects (not free text) to prevent constraint violations
  - Bucket is dropdown select with real bucket values

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
  Header.tsx                 # Navigation + global search + sign-out (server)

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

**stage** (16 values, in order)
- `dm_sent` — Initial Instagram DM sent
- `responded` — Prospect responded to DM
- `phone` — Phone call made or scheduled
- `meeting` — In-person or video meeting held
- `proposal` — Proposal or quote sent
- `negotiation` — Actively negotiating terms
- `contract_pending` — Contract sent, awaiting signature
- `contract_signed` — Contract signed by prospect
- `deposit_pending` — Awaiting deposit payment
- `deposit_received` — Deposit received, event booked
- `event_scheduled` — Event date finalized
- `stalled` — Conversation stalled, needs follow-up
- `lost` — Deal lost (generic)
- `competitor` — Lost to competitor service
- `dnc` — Do not contact (legal/compliance issue)
- `archived` — Old or inactive entry

**classification** (11 values)
- `active` — Current active opportunity
- `future` — Future prospect to revisit
- `competitor` — Currently using competitor
- `planned` — Already have event planned
- `not_interested` — Declined interest
- `too_small` — Insufficient budget or size
- `blocked` — Cannot contact or legal hold
- `dnc` — Do not contact flag
- `bad_account` — Invalid or fraudulent account
- `wrong_chapter` — Incorrect chapter identification
- `duplicate` — Duplicate record

**bucket** (6 values, for recovery workflows)
- `recent_one_touch` — Recently had single touch point
- `stale_one_touch` — Old single touch point
- `stalled_reply` — Reply conversation stalled
- `phone_handoff` — Ready for phone call handoff
- `missed_warm` — Warm opportunity that was missed
- `blocked` — Cannot contact due to block/legal

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

- Implement "Done" button and "Set Next" modal on TODAY QUEUE
- Add contact/communication creation UI
- Implement rep filter on Pipeline and Recovery pages
- Add filtering by bucket on Pipeline page

## Deployment

- Deploy to Vercel (native Next.js support)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase dashboard)
- All auth and data queries work seamlessly in production
