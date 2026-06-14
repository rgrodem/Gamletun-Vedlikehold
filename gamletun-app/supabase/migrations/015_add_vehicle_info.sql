-- Kjøretøy-/tilhengeropplysninger på utstyr.
-- Manuelle felter nå; samme kolonner fylles automatisk senere når
-- Statens Vegvesen-API-et kobles på (registration_number er nøkkelen for
-- oppslaget). EU-kontroll er bevisst utelatt i denne omgangen.

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS total_weight_kg INTEGER,
  ADD COLUMN IF NOT EXISTS curb_weight_kg INTEGER,
  ADD COLUMN IF NOT EXISTS tire_dimension TEXT;

COMMENT ON COLUMN public.equipment.registration_number IS
  'Registreringsnummer (skilt), f.eks. RU 4033. Nøkkel for fremtidig kjøretøyoppslag.';
COMMENT ON COLUMN public.equipment.total_weight_kg IS 'Tillatt totalvekt i kg';
COMMENT ON COLUMN public.equipment.curb_weight_kg IS 'Egenvekt i kg';
COMMENT ON COLUMN public.equipment.tire_dimension IS 'Dekkdimensjon, f.eks. 155 R 13';
