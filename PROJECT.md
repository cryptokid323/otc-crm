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
  - Lists chapters with actions due (next_action_date ≤ today, classification = 'active')
  - Grouped by urgency: OVERDUE (red) | DUE TODAY (amber) | THIS WEEK (gray)
  - Two-line row format: Fraternity + School + Tier badge; Action chip + Next action + Last contact
  - Shows latest communication inline (direction + channel + truncated body)
  - Shows assigned rep badge on each row
  - Multi-select checkboxes for bulk operations
  - Bulk "Assign to rep" action with dropdown
  - Server-rendered via page.tsx + client-rendered TodayQueueClient component
  - Filter by action type (send_dm, follow_up, call, etc.)

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
  - Shows assigned rep badge and latest communication inline
  - Shows school tier, stage, next action, and next action date
  - Card links to chapter detail
  - Phone number shown inline for phone_handoff bucket

- **`/scripts`** — SCRIPTS Performance
  - Script funnel view: sent, replies, reply_rate per script version
  - Server-rendered table (script_funnel view — ready to be created in database)
  - Graceful error handling if view doesn't exist

- **`/chapters/[id]`** — CHAPTER DETAIL
  - Server-rendered chapter fetcher + layout with school, rep, and communications data
  - Header: Fraternity name + School name + Tier badge + Region + "Verify before DM" warning
  - TimelineAndForm component: Communications timeline above fold
    - Newest first with inbound/outbound visual distinction (blue/green dots)
    - Message logging form (channel, direction, date, body)
    - Auto-updates chapter.last_contact on message save
    - Timeline refreshes immediately with new message
  - ChapterEditor client component (editable fields)
  - Sidebar: Assigned rep panel with name and email
  - Sidebar: Details panel (stage, classification, bucket, IG handle, script version)
  - Sidebar: Next Action panel (quick view)
  - Contacts section (fetched server-side, displays with phone/email/role)
  - All edits via client-side mutation (ChapterEditor)
  - Stage and Script Version are dropdown selects to prevent constraint violations

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
    TimelineAndForm.tsx      # Communications timeline + message logging (client)
  TodayQueueClient.tsx       # Interactive queue with multi-select, grouping, bulk assign (client)
  page.tsx                   # TODAY QUEUE (server, calls TodayQueueClient)
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
- `school_id` (uuid, fk → schools)
- `fraternity` (text)
- `ig_handle` (text)
- `assigned_rep_id` (uuid, fk → reps)
- `stage` (text, CHECK constraint)
- `classification` (text, CHECK constraint)
- `bucket` (text, CHECK constraint — one of 6 values)
- `script_version` (text)
- `last_contact` (date)
- `next_action` (text)
- `next_action_type` (text, CHECK constraint)
- `next_action_date` (date)
- `notes` (text)
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
- `contact_id` (uuid, fk → contacts, nullable)
- `channel` (text) — 'instagram', 'email', 'text', 'call', etc.
- `direction` (text) — 'in' (inbound) or 'out' (outbound)
- `sent_on` (date)
- `body` (text)
- `created_at` (timestamp)

**schools**
- `id` (uuid, pk)
- `name` (text)
- `state` (text)
- `region` (text)
- `tier` (text)
- `outreach_track` (text)
- `greek_rank` (text)
- `prospect_status` (text)
- `verify_before_dm` (text) — 'Yes', 'No', or null (added in migration 002)
- `created_at`, `updated_at` (timestamps)

**scripts**
- `id` (uuid, pk)
- `version` (text)
- `name` (text)
- `content` (text)
- `created_at` (timestamp)

**reps**
- `id` (uuid, pk)
- `name` (text)
- `email` (text) — added in migration 002
- `active` (boolean)
- `created_at`, `updated_at` (timestamps)

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
2. **Server-first architecture** — Server components fetch data, client components handle mutations and interactivity only
3. **No client-side state management** — React state only for form UX; Supabase is source of truth
4. **Cookie-based sessions** — Supabase Auth with httpOnly cookies prevents XSS attacks
5. **Dense, mobile-first UI** — Tailwind CSS with compact rows and cards for sales rep workflows
6. **Efficient data queries** — Single query per page with Supabase relationships (schools, reps, communications) — no N+1 queries
7. **Timeline-first detail views** — Communications moved above fold for prominence and quick context
8. **Grouped urgency view** — Today Queue organized by OVERDUE/DUE TODAY/THIS WEEK for quick scanning

## Recent Changes (Aug 2026)

### Visual/Workflow Batch Implementation ✓ COMPLETE
**Part 1 — Rep Assignment**
- Show assigned rep on every chapter row and chapter detail sidebar
- Multi-select checkboxes on Today Queue with bulk "Assign to rep" action
- Email mapping: michaelvita@otctrips.com → Michael, tylerdaley@otctrips.com → Tyler, davisdeal@otctrips.com → Davis
- My Queue / All toggle filters by logged-in user's assigned chapters

**Part 2 — Today Queue Restructure**
- Group rows into sections: OVERDUE (red) | DUE TODAY (amber) | THIS WEEK (gray)
- Two-line dense row format: Line 1 = Fraternity + School + Tier badge (if tier exists)
- Line 2 = Action type chip + Next action detail + Last contact date
- Currently 242 OVERDUE, 0 DUE TODAY, 0 THIS WEEK (correct per data)

**Part 3 — Inline Conversation Context**
- Latest communication shows on every row: direction (←/→) + channel + body preview (~90 chars, muted)
- Single efficient query per page — no N+1 queries
- Renders on Today Queue and Recovery pages

**Part 4 — Chapter Detail Timeline**
- Communications timeline prominent above fold, newest first
- Inbound (blue dot) / Outbound (green dot) visual distinction
- School tier, region, and "Verify before DM" warning badge in header
- Assigned rep displays in sidebar with email address

**Part 5 — Log a Message**
- Form on chapter detail: channel (instagram/email/text/call/other), direction (in/out), date, body
- Auto-updates chapter.last_contact on save
- Timeline updates immediately with new message
- Delete button on each message with confirmation

**Database Updates**
- Added email column to reps table (migration 002)
- Added verify_before_dm column to schools table (migration 002)
- **620 total chapters** (611 original + 9 new from import), 3 reps, 211 schools
- **1,121 total communications** (1,206 messages imported with 60 deduplicated)

### Instagram Full-History Import ✓ COMPLETE (Aug 13, 2026)
**Source:** Instagram export from Aug 6 2025 → Aug 6 2026, filtered to fraternity threads only

**Import Summary:**
- **9 new chapters created** (inferred school, matched via handle)
  - 3 with identified schools: University of South Florida, Florida International University (×2), University of Tennessee Knoxville, University of Florida, Indiana University Bloomington
  - 3 with "Unidentified" school: Sigma Chi Zeta Zeta, Pi Kappa Alpha, Tau Epsilon Phi
- **544 chapters matched** from existing 611
- **1,121 total communications** imported (inbound: 252, outbound: 748)
  - 60 deduped (same chapter + same date + same body MD5)
  - Deduplication ensures no exact duplicates within chapter
- **132 chapters** have at least one inbound message
- **67 chapters** with no thread in export (communications preserved)

**Script Attribution (Corrected):**
Real script counts from actual outbound messages (not chapter records):
- Script A: 661 sent, 77 replies (11.6% reply rate)
- Script B: 18 sent, 0 replies (0.0% reply rate)
- Custom/Other: 225 sent, 13 replies (5.8% reply rate)

**Data Integrity:**
- Zero NULL sent_on or body values
- All communications in chronological order by sent_on
- last_contact updated for all 553 chapters with new messages
- Chapters absent from import untouched (communications preserved)

## Next Steps

- "My Queue" filter fully functional (email-based rep filtering now enabled)
- Implement "Done" button on TODAY QUEUE to mark chapters complete
- Add "Set Next" modal for quick next action date updates
- Bulk assign action on Recovery and Schools pages
- Contact creation UI for chapters

## Deployment

- Deploy to Vercel (native Next.js support)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase dashboard)
- All auth and data queries work seamlessly in production
