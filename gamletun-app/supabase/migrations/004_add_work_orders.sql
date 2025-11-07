-- Migration: Add Work Orders system
-- Description: Adds work orders for planned maintenance, fault reporting, and inspections

-- 1. Create work_orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,

  -- Type and status
  type TEXT NOT NULL CHECK (type IN ('scheduled', 'corrective', 'inspection')),
    -- scheduled = planlagt vedlikehold
    -- corrective = feilretting
    -- inspection = inspeksjon

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',           -- Ny/Åpen
    'scheduled',      -- Planlagt (har dato)
    'in_progress',    -- Pågår
    'waiting_parts',  -- Venter på deler
    'completed',      -- Fullført
    'closed'          -- Lukket (arkivert)
  )),

  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Details
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours DECIMAL(10,2),
  estimated_cost DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  actual_cost DECIMAL(10,2),

  -- Scheduling
  due_date TIMESTAMP WITH TIME ZONE,
  scheduled_date TIMESTAMP WITH TIME ZONE,

  -- Recurring (for scheduled maintenance)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval_days INTEGER,
  recurrence_interval_hours INTEGER,
  next_due_date TIMESTAMP WITH TIME ZONE,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Link to completed maintenance log
  completed_maintenance_log_id UUID REFERENCES public.maintenance_logs(id) ON DELETE SET NULL,

  -- Checklist (JSON array)
  checklist JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"task": "Bytt olje", "completed": false}, {"task": "Sjekk lys", "completed": true}]

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create work_order_comments table
CREATE TABLE IF NOT EXISTS public.work_order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  status_change_from TEXT,
  status_change_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_type ON public.work_orders(type);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON public.work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_next_due_date ON public.work_orders(next_due_date);
CREATE INDEX IF NOT EXISTS idx_work_order_comments_work_order ON public.work_order_comments(work_order_id);

-- 4. Enable RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_comments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for work_orders
CREATE POLICY "Anyone can view work orders"
  ON public.work_orders FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create work orders"
  ON public.work_orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update work orders"
  ON public.work_orders FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete work orders"
  ON public.work_orders FOR DELETE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 6. RLS Policies for work_order_comments
CREATE POLICY "Anyone can view work order comments"
  ON public.work_order_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.work_order_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments"
  ON public.work_order_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.work_order_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_work_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_work_orders_updated_at();

-- 8. Add comments for documentation
COMMENT ON TABLE public.work_orders IS 'Work orders for planned maintenance, fault reporting, and inspections';
COMMENT ON TABLE public.work_order_comments IS 'Comments and status change history for work orders';
COMMENT ON COLUMN public.work_orders.type IS 'Type: scheduled (planlagt), corrective (feil), inspection (inspeksjon)';
COMMENT ON COLUMN public.work_orders.status IS 'Status: open, scheduled, in_progress, waiting_parts, completed, closed';
COMMENT ON COLUMN public.work_orders.priority IS 'Priority: low, medium, high, urgent';
COMMENT ON COLUMN public.work_orders.checklist IS 'JSON array of checklist items with task and completed status';
