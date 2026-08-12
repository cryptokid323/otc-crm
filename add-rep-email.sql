-- Add email column to reps table
ALTER TABLE reps ADD COLUMN IF NOT EXISTS email text;

-- Set emails for existing reps (manually update after migration)
-- UPDATE reps SET email = 'michaelvita@otctrips.com' WHERE name = 'Michael';
-- UPDATE reps SET email = 'tylerdaley@otctrips.com' WHERE name = 'Tyler';

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_reps_email ON reps(email);
