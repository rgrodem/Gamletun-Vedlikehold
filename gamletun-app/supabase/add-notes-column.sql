-- Legg til manglende kolonner i equipment tabellen
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS purchase_date DATE;

ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Gjør performed_by nullable (i tilfelle det ikke allerede er det)
ALTER TABLE public.maintenance_logs
ALTER COLUMN performed_by DROP NOT NULL;
