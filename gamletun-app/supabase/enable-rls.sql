-- Enable RLS on all tables
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow authenticated users to create equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow authenticated users to update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment" ON public.equipment;

DROP POLICY IF EXISTS "Allow authenticated users to view maintenance_logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to create maintenance_logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update maintenance_logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to delete maintenance_logs" ON public.maintenance_logs;

DROP POLICY IF EXISTS "Allow authenticated users to view maintenance_types" ON public.maintenance_types;
DROP POLICY IF EXISTS "Allow authenticated users to create maintenance_types" ON public.maintenance_types;
DROP POLICY IF EXISTS "Allow authenticated users to update maintenance_types" ON public.maintenance_types;
DROP POLICY IF EXISTS "Allow authenticated users to delete maintenance_types" ON public.maintenance_types;

DROP POLICY IF EXISTS "Allow authenticated users to view categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to create categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to update categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to delete categories" ON public.categories;

-- Equipment policies (all authenticated users can do everything)
CREATE POLICY "Allow authenticated users to view equipment"
ON public.equipment FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create equipment"
ON public.equipment FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update equipment"
ON public.equipment FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete equipment"
ON public.equipment FOR DELETE
TO authenticated
USING (true);

-- Maintenance logs policies (all authenticated users can do everything)
CREATE POLICY "Allow authenticated users to view maintenance_logs"
ON public.maintenance_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create maintenance_logs"
ON public.maintenance_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update maintenance_logs"
ON public.maintenance_logs FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete maintenance_logs"
ON public.maintenance_logs FOR DELETE
TO authenticated
USING (true);

-- Maintenance types policies (all authenticated users can do everything)
CREATE POLICY "Allow authenticated users to view maintenance_types"
ON public.maintenance_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create maintenance_types"
ON public.maintenance_types FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update maintenance_types"
ON public.maintenance_types FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete maintenance_types"
ON public.maintenance_types FOR DELETE
TO authenticated
USING (true);

-- Categories policies (all authenticated users can do everything)
CREATE POLICY "Allow authenticated users to view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (true);
