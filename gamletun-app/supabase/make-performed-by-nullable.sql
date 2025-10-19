-- Make performed_by nullable so we can log maintenance without authentication
ALTER TABLE public.maintenance_logs
ALTER COLUMN performed_by DROP NOT NULL;
