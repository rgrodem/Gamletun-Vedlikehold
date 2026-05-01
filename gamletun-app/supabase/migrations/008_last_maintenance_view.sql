-- Migration 008: Performance view for last maintenance per equipment
--
-- Background: app/page.tsx used to fetch ALL rows from maintenance_logs just to
-- pick out the most recent performed_date per equipment_id. That cost grows linearly
-- and dominates the dashboard's load time. This view materialises that lookup so
-- the dashboard can fetch one row per equipment instead of every log.
--
-- The view uses security_invoker so RLS on maintenance_logs still applies to the
-- caller (Supabase / PostgREST default). The existing index
-- idx_maintenance_logs_performed_date keeps the DISTINCT ON cheap.

CREATE OR REPLACE VIEW public.equipment_last_maintenance
WITH (security_invoker = true) AS
SELECT DISTINCT ON (equipment_id)
  equipment_id,
  performed_date
FROM public.maintenance_logs
ORDER BY equipment_id, performed_date DESC;

-- Allow the same roles that can read maintenance_logs to read the view.
GRANT SELECT ON public.equipment_last_maintenance TO anon, authenticated;
