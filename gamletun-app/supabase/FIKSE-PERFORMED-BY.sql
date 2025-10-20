-- VIKTIG: Kjør dette ALENE i en NY query i Supabase SQL Editor

-- Sjekk først hva som er problemet
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.maintenance_logs'::regclass
  AND conname LIKE '%performed_by%';

-- Fjern foreign key constraint midlertidig
ALTER TABLE public.maintenance_logs
DROP CONSTRAINT IF EXISTS maintenance_logs_performed_by_fkey;

-- Gjør performed_by nullable
ALTER TABLE public.maintenance_logs
ALTER COLUMN performed_by DROP NOT NULL;

-- Legg tilbake foreign key constraint, men tillat NULL
ALTER TABLE public.maintenance_logs
ADD CONSTRAINT maintenance_logs_performed_by_fkey
FOREIGN KEY (performed_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
