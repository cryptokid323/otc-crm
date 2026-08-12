-- Add next_action_type column to chapters table
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS next_action_type text
  CHECK (next_action_type is null or next_action_type in (
    'send_dm','follow_up_1','follow_up_2','reply_thread','text_handoff',
    'call','send_quote','schedule_call','find_alt_channel','re_engage_later'
  ));

-- Create index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_chapters_next_action_type
  ON chapters(next_action_type);
