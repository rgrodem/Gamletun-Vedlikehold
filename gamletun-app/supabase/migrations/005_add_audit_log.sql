-- Migration: Add audit log functionality
-- Description: Track all create, update, and delete operations for compliance and troubleshooting

-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- RLS Policies
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System/authenticated users can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Audit log function for equipment
CREATE OR REPLACE FUNCTION audit_equipment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, user_id, user_email)
    VALUES (
      'equipment',
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid(),
      auth.email()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, user_id, user_email)
    VALUES (
      'equipment',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      auth.email()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, user_id, user_email)
    VALUES (
      'equipment',
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      auth.uid(),
      auth.email()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit log function for maintenance_logs
CREATE OR REPLACE FUNCTION audit_maintenance_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, user_id, user_email)
    VALUES (
      'maintenance_logs',
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid(),
      auth.email()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, user_id, user_email)
    VALUES (
      'maintenance_logs',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      auth.email()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, user_id, user_email)
    VALUES (
      'maintenance_logs',
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      auth.uid(),
      auth.email()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit log function for work_orders
CREATE OR REPLACE FUNCTION audit_work_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, user_id, user_email)
    VALUES (
      'work_orders',
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid(),
      auth.email()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, user_id, user_email)
    VALUES (
      'work_orders',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      auth.email()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, user_id, user_email)
    VALUES (
      'work_orders',
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      auth.uid(),
      auth.email()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for equipment
DROP TRIGGER IF EXISTS equipment_audit_trigger ON public.equipment;
CREATE TRIGGER equipment_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION audit_equipment_changes();

-- Create triggers for maintenance_logs
DROP TRIGGER IF EXISTS maintenance_logs_audit_trigger ON public.maintenance_logs;
CREATE TRIGGER maintenance_logs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION audit_maintenance_log_changes();

-- Create triggers for work_orders
DROP TRIGGER IF EXISTS work_orders_audit_trigger ON public.work_orders;
CREATE TRIGGER work_orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION audit_work_order_changes();

-- Add comments for documentation
COMMENT ON TABLE public.audit_log IS 'Audit trail for all data modifications (equipment, maintenance, work orders)';
COMMENT ON COLUMN public.audit_log.table_name IS 'Name of the table that was modified';
COMMENT ON COLUMN public.audit_log.record_id IS 'ID of the record that was modified';
COMMENT ON COLUMN public.audit_log.action IS 'Type of operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN public.audit_log.old_data IS 'Complete record data before the change (for UPDATE and DELETE)';
COMMENT ON COLUMN public.audit_log.new_data IS 'Complete record data after the change (for INSERT and UPDATE)';
COMMENT ON COLUMN public.audit_log.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN public.audit_log.user_email IS 'Email of the user who performed the action (for reference even if user is deleted)';
