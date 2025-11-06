-- VIKTIG: Kjør dette i Supabase SQL Editor
-- Dette fikser foreign key constraint problemet for performed_by

-- Fjern eksisterende foreign key constraint
ALTER TABLE public.maintenance_logs
DROP CONSTRAINT IF EXISTS maintenance_logs_performed_by_fkey;

-- Gjør performed_by nullable (hvis ikke allerede gjort)
ALTER TABLE public.maintenance_logs
ALTER COLUMN performed_by DROP NOT NULL;

-- Legg tilbake foreign key constraint som refererer til auth.users
-- og tillater NULL verdier
ALTER TABLE public.maintenance_logs
ADD CONSTRAINT maintenance_logs_performed_by_fkey
FOREIGN KEY (performed_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Samme for equipment_documents
ALTER TABLE public.equipment_documents
DROP CONSTRAINT IF EXISTS equipment_documents_uploaded_by_fkey;

ALTER TABLE public.equipment_documents
ADD CONSTRAINT equipment_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Samme for maintenance_attachments
ALTER TABLE public.maintenance_attachments
DROP CONSTRAINT IF EXISTS maintenance_attachments_uploaded_by_fkey;

ALTER TABLE public.maintenance_attachments
ADD CONSTRAINT maintenance_attachments_uploaded_by_fkey
FOREIGN KEY (uploaded_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Verifiser at alt er OK
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND (
    kcu.column_name = 'performed_by'
    OR kcu.column_name = 'uploaded_by'
  )
ORDER BY tc.table_name;
