-- Temporary fix: Allow anonymous users full access during development
-- (Later we'll add proper authentication)

-- Disable RLS temporarily on all tables
ALTER TABLE public.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
