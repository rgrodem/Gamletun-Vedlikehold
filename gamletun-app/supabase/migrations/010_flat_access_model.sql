-- Flat tilgangsmodell for ~5-6 betrodde brukere. Anvendt 2026-06.
-- Det finnes ingen admin-brukere (alle får role 'user'), så admin-gated DELETE
-- var i praksis umulig -> ingen kunne fjerne utstyr/arbeidsordrer.
-- Erstatt med authenticated-tilgang (alle innloggede kan slette).

-- equipment: erstatt admin-only DELETE med authenticated DELETE
drop policy if exists "Only admins can delete equipment" on public.equipment;
create policy "Authenticated can delete equipment"
  on public.equipment for delete
  to authenticated
  using (true);

-- work_orders: fjern redundant admin-DELETE (beholder eksisterende authenticated-DELETE)
drop policy if exists "Only admins can delete work orders" on public.work_orders;

-- maintenance_types: fjern duplikat anon-SELECT (authenticated "manage"-policy dekker lesing)
drop policy if exists "Anyone can view maintenance types" on public.maintenance_types;
