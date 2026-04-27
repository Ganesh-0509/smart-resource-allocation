-- Migration: Add status field to ngos table
-- Run this in Supabase SQL Editor

ALTER TABLE ngos 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'suspended'));

-- Update any existing NGOs to 'approved' so they aren't locked out
UPDATE ngos SET status = 'approved' WHERE status = 'pending';

-- Add a phone and description field for richer NGO profiles
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS district text;

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_ngos_status ON ngos(status);
