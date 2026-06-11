-- Flat tilgangsmodell også for endring/sletting av vedlikeholdslogger.
-- Tidligere kunne bare den som opprettet en logg slette/endre den
-- (performed_by = auth.uid()). Det ga "stille" sletting av 0 rader uten
-- feilmelding når man prøvde å slette andres logger — f.eks. logger
-- opprettet automatisk fra fullførte arbeidsordrer.

DROP POLICY IF EXISTS "Users can update own maintenance logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Users can delete own maintenance logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update maintenance_logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Allow authenticated users to delete maintenance_logs" ON public.maintenance_logs;

CREATE POLICY "Authenticated can update maintenance logs"
  ON public.maintenance_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete maintenance logs"
  ON public.maintenance_logs FOR DELETE
  TO authenticated
  USING (true);
