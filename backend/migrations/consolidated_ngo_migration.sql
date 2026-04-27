-- ==========================================
-- CONSOLIDATED NGO MIGRATION
-- ==========================================
-- This script adds the necessary columns for the expanded NGO registration 
-- and the Super Admin approval workflow.
-- Run this in the Supabase SQL Editor.

-- 1. Add Status and Verification fields
ALTER TABLE ngos 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'suspended'));

-- 2. Add Organization Detail fields
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS org_type text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS website text;

-- 3. Update existing data (optional but recommended)
-- Set existing NGOs to 'approved' so they are not blocked by the new workflow
UPDATE ngos SET status = 'approved' WHERE status = 'pending';

-- 4. Create Index for performance
CREATE INDEX IF NOT EXISTS idx_ngos_status ON ngos(status);

-- 5. Audit Log Update (Ensure entity_type 'ngo' is handled)
-- No explicit action needed for enum-less text columns, but ensure the admin 
-- portal can read/write status safely.
