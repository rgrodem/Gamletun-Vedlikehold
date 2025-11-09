-- VIKTIG: Kjør dette i Supabase SQL Editor
-- Dette sikrer at alle brukere har profiler og fikser foreign key relasjoner

-- Opprett profiler for alle auth.users som mangler profil
INSERT INTO public.profiles (id, email, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Oppdater maintenance_logs foreign key til å peke direkte til profiles
-- (i stedet for auth.users, slik at join blir enklere)
ALTER TABLE public.maintenance_logs
DROP CONSTRAINT IF EXISTS maintenance_logs_performed_by_fkey;

ALTER TABLE public.maintenance_logs
ADD CONSTRAINT maintenance_logs_performed_by_fkey
FOREIGN KEY (performed_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Oppdater work_order_comments foreign key til å peke til profiles
ALTER TABLE public.work_order_comments
DROP CONSTRAINT IF EXISTS work_order_comments_user_id_fkey;

ALTER TABLE public.work_order_comments
ADD CONSTRAINT work_order_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Verifiser at alt er OK
SELECT
  'Antall brukere uten profil:' as info,
  COUNT(*) as antall
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
UNION ALL
SELECT
  'Antall maintenance_logs uten profil:' as info,
  COUNT(*) as antall
FROM public.maintenance_logs
WHERE performed_by IS NOT NULL
  AND performed_by NOT IN (SELECT id FROM public.profiles);
