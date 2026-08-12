-- Add email column to reps table and set up rep emails
ALTER TABLE reps ADD COLUMN IF NOT EXISTS email text;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_reps_email ON reps(email);

-- Add a schools column to store school tier and region info for verification
ALTER TABLE schools ADD COLUMN IF NOT EXISTS verify_before_dm text DEFAULT NULL;
