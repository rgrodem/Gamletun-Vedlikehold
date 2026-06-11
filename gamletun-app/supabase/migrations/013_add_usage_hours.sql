-- Driftstimer (timeteller) på utstyr + timebasert forfall på arbeidsordrer.
-- usage_hours oppdateres manuelt fra maskinens timeteller. En arbeidsordre
-- med due_hours regnes som forfalt når utstyrets timeteller passerer verdien.

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS usage_hours NUMERIC(10,1);

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS due_hours NUMERIC(10,1);

COMMENT ON COLUMN public.equipment.usage_hours IS
  'Timeteller (driftstimer) avlest fra maskinen, oppdateres manuelt';
COMMENT ON COLUMN public.work_orders.due_hours IS
  'Forfaller når utstyrets usage_hours når denne verdien (i tillegg til evt. due_date)';
