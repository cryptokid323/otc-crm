# Instagram Full-History Backfill — Instructions for Claude Code

Source: Instagram export `instagram-michaelvita_-2026-08-06`, covering
Aug 6 2025 → Aug 6 2026. Parsed and filtered to fraternity threads only.

## Files
- `ig_messages_import.json` — 1,206 fraternity messages, both directions.
  Fields per message: `handle`, `direction` ("in"/"out"), `sent_on`
  (YYYY-MM-DD), `body`, `script` ("A"/"B"/"R"/null, detected from message
  text for outbound only).
- `ig_threads_review.csv` — 687 fraternity threads, one row each, for the
  user to review. Sorted with replied threads first.

## What is NOT here
194 personal threads (family, friends, barber, etc.) were excluded by the
fraternity-token filter. Do not import them.

## Steps

### 1. Match handles → chapters
Normalize both sides: lowercase, strip leading `@`, strip any trailing
`_<digits>`. Match `handle` against `chapters.ig_handle`.

Report three numbers before doing anything:
- threads matched to an existing chapter
- threads with NO matching chapter (expected ~76) — these are missing leads
- chapters in the CRM with no thread in the export

### 2. Output the unmatched list for review — DO NOT create chapters yet
For each unmatched fraternity handle, output: handle, display name, message
counts, replied yes/no, first/last message date, and a suggested school
inferred from the handle text where possible. The user reviews this list and
approves before any chapter is created.

### 3. Replace communications for matched chapters
The user has approved a FULL REPLACE — the export is richer than the current
131 rows (which are inbound-only).

- Delete existing `communications` rows for chapters that appear in this
  import, then insert the export messages. Do this in a transaction.
- Insert with: chapter_id, channel='instagram', direction, sent_on, body.
- The unique index is (chapter_id, sent_on, md5(body)) — dedupe within the
  import itself before inserting, since a chapter can have two identical
  messages on the same day.
- Update `chapters.last_contact` to the max `sent_on` per chapter.

### 4. Fix script attribution
`script` on outbound messages is detected from actual message text, not from
`chapters.script_version`. Current CRM numbers are wrong because they were
inferred from the chapter record rather than what was really sent.

Real counts in this export: Script A = 661 outbound, Script B = 18,
custom/other = 234.

Rebuild the /scripts page to compute reply rate from communications:
for each script, sent = count of outbound messages with that script; replies
= count of chapters that have an inbound message dated AFTER an outbound
message of that script. This gives an honest rate. Expect Script A to land
around 15–20%, not 0%.

### 5. Verify
- total communications after import (expect ~1,206 + any unmatched retained)
- chapters with at least one inbound message (expect ~134 of the matched set)
- no NULL sent_on, no empty body
- spot-check 3 chapters in the browser: timeline shows both directions in
  date order

Commit and push. Update PROJECT.md with the new communication counts and the
corrected script-attribution logic.
