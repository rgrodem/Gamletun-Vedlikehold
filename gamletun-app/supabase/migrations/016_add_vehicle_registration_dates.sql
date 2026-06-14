-- Årsmodell på utstyr (kjøretøy/tilhenger): lagres som dato for "registrert
-- første gang", der året er årsmodellen. Hentes fra Statens Vegvesen sammen
-- med vekt/dekk, men kan også fylles manuelt.
--
-- "Registrert på eier" lagres IKKE i egen kolonne — den fyller det
-- eksisterende feltet equipment.purchase_date ("Anskaffet").

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS first_registration_date DATE;

COMMENT ON COLUMN public.equipment.first_registration_date IS
  'Registrert første gang (i Norge). Året = årsmodell.';
