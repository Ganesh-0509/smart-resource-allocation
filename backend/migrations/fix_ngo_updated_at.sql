-- Migration: Add missing updated_at column to ngos and field_workers
-- Also ensure triggers are correctly set up.

-- 1. Add updated_at to ngos
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE ngos SET updated_at = now() WHERE updated_at IS NULL;

-- 2. Add updated_at to field_workers (if missing)
ALTER TABLE field_workers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Ensure the update function exists
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Apply triggers
DROP TRIGGER IF EXISTS trg_ngos_updated_at ON ngos;
CREATE TRIGGER trg_ngos_updated_at
BEFORE UPDATE ON ngos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_field_workers_updated_at ON field_workers;
CREATE TRIGGER trg_field_workers_updated_at
BEFORE UPDATE ON field_workers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
