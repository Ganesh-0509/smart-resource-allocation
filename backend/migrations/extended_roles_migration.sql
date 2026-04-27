-- ==========================================
-- EXTENDED ROLES MIGRATION
-- ==========================================
-- This script adds comprehensive fields for Volunteers and 
-- initializes the Field Worker role.

-- 1. Extend Volunteers Table
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS email text UNIQUE,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS blood_group text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS id_proof_type text,
ADD COLUMN IF NOT EXISTS id_proof_number text,
ADD COLUMN IF NOT EXISTS ward text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'inactive', 'rejected')),
ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- Tell Supabase to reload the schema cache so API picks up new columns
NOTIFY pgrst, 'reload schema';

-- 2. Create Field Workers Table
CREATE TABLE IF NOT EXISTS field_workers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ngo_id uuid REFERENCES ngos(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text UNIQUE NOT NULL,
    email text UNIQUE,
    designation text, -- e.g., 'Primary Health Worker', 'Disaster Assessor'
    base_location text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    pin_hash text, -- For simple PIN-based login
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexing for lookup
CREATE INDEX IF NOT EXISTS idx_field_workers_phone ON field_workers(phone);
CREATE INDEX IF NOT EXISTS idx_field_workers_ngo_id ON field_workers(ngo_id);
