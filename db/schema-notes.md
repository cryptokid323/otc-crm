# OTC Trips CRM Database Schema

## Tables

### chapters
Core fraternity chapter data.

**Columns:**
- `id` (uuid, primary key)
- `fraternity` (text) - Chapter name
- `school` (text) - University name
- `ig_handle` (text) - Instagram handle
- `stage` (text) - Current stage (CHECK constraint, 16 possible values)
- `classification` (text) - 'active', 'inactive', etc.
- `bucket` (text) - Recovery bucket: 6 possible values
- `script_version` (text) - Current script version
- `next_action` (text) - Description of next action
- `next_action_date` (date) - When next action should happen
- `notes` (text) - Additional notes
- `rep_id` (uuid, foreign key to reps)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### contacts
Chapter contacts and leadership.

**Columns:**
- `id` (uuid, primary key)
- `chapter_id` (uuid, foreign key to chapters)
- `name` (text)
- `phone` (text)
- `email` (text)
- `role` (text)
- `created_at` (timestamp)

### communications
Communication log/timeline for each chapter.

**Columns:**
- `id` (uuid, primary key)
- `chapter_id` (uuid, foreign key to chapters)
- `type` (text) - 'call', 'email', 'text', 'meeting', etc.
- `subject` (text)
- `notes` (text)
- `created_at` (timestamp)
- `created_by` (uuid, foreign key to reps)

### scripts
Script templates.

**Columns:**
- `id` (uuid, primary key)
- `version` (text)
- `name` (text)
- `content` (text)
- `created_at` (timestamp)

### script_funnel (View)
Performance metrics per script.

**Columns:**
- `script_version` (text)
- `sent` (integer)
- `replies` (integer)
- `reply_rate` (numeric)

### reps
Sales representatives.

**Columns:**
- `id` (uuid, primary key)
- `email` (text)
- `name` (text)
- `created_at` (timestamp)

## Enum/Check Constraint Values

### stage (16 values)
- dm_sent, responded, phone, meeting, proposal, negotiation, contract_pending, contract_signed, deposit_pending, deposit_received, event_scheduled, stalled, lost, competitor, dnc, archived

### classification (11 values)
- active, future, competitor, planned, not_interested, too_small, blocked, dnc, bad_account, wrong_chapter, duplicate

### bucket (6 values)
- recent_one_touch, stale_one_touch, stalled_reply, phone_handoff, missed_warm, blocked

## Notes
- Database currently empty; schema inferred from requirements
- RLS policies in place
- All timestamps in UTC
