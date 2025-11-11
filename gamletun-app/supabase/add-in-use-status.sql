-- VIKTIG: Kjør dette i Supabase SQL Editor
-- Dette oppdaterer equipment status constraint for å inkludere 'in_use'

-- Fjern gammel CHECK constraint
ALTER TABLE public.equipment
DROP CONSTRAINT IF EXISTS equipment_status_check;

-- Legg til ny CHECK constraint med 'in_use' inkludert
ALTER TABLE public.equipment
ADD CONSTRAINT equipment_status_check
CHECK (status IN ('active', 'inactive', 'maintenance', 'in_use'));

-- Verifiser at constraint er oppdatert
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.equipment'::regclass
  AND conname = 'equipment_status_check';
