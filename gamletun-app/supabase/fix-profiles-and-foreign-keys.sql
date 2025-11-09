-- VIKTIG: Kjør dette i Supabase SQL Editor
-- Dette sikrer at alle brukere har profiler og fikser foreign key relasjoner

-- Steg 1: Opprett profiler for alle auth.users som mangler profil
INSERT INTO public.profiles (id, full_name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Steg 2: Slett eventuelle "døde" performed_by referanser som ikke har auth.users
-- (Dette må gjøres FØR vi endrer foreign key)
UPDATE public.maintenance_logs
SET performed_by = NULL
WHERE performed_by IS NOT NULL
  AND performed_by NOT IN (SELECT id FROM auth.users);

UPDATE public.work_order_comments
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Steg 3: Nå kan vi trygt oppdatere foreign keys til å peke til profiles
ALTER TABLE public.maintenance_logs
DROP CONSTRAINT IF EXISTS maintenance_logs_performed_by_fkey;

ALTER TABLE public.maintenance_logs
ADD CONSTRAINT maintenance_logs_performed_by_fkey
  FOREIGN KEY (performed_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.work_order_comments
DROP CONSTRAINT IF EXISTS work_order_comments_user_id_fkey;

ALTER TABLE public.work_order_comments
ADD CONSTRAINT work_order_comments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Steg 4: Verifiser at alt er OK
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
  AND performed_by NOT IN (SELECT id FROM public.profiles)
UNION ALL
SELECT
  'Antall work_order_comments uten profil:' as info,
  COUNT(*) as antall
FROM public.work_order_comments
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM public.profiles);
