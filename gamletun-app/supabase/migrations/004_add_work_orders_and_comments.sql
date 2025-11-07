-- Migration: Add work orders and comments functionality
-- Description: Adds work_orders table for tracking tasks and comments table for discussions

-- ============================================
-- WORK ORDERS TABLE
-- ============================================

-- Create work_orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  completed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for work_orders
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON public.work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON public.work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);

-- Add updated_at trigger for work_orders
CREATE OR REPLACE FUNCTION update_work_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS work_orders_updated_at ON public.work_orders;
CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_work_orders_updated_at();

-- Enable RLS for work_orders
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Authenticated users can create work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Authenticated users can update work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Authenticated users can delete work orders" ON public.work_orders;

-- Create RLS policies for work_orders
CREATE POLICY "Anyone can view work orders"
  ON public.work_orders FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create work orders"
  ON public.work_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update work orders"
  ON public.work_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete work orders"
  ON public.work_orders FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- COMMENTS TABLE
-- ============================================

-- Create comments table (for work orders, equipment, maintenance logs)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('work_order', 'equipment', 'maintenance_log')),
  parent_id UUID NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON public.comments(created_by);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- Add updated_at trigger for comments
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_updated_at ON public.comments;
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- Enable RLS for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Create RLS policies for comments
CREATE POLICY "Anyone can view comments"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.work_orders IS 'Tracks work orders/tasks for equipment maintenance and repairs';
COMMENT ON TABLE public.comments IS 'Comments/discussions on work orders, equipment, or maintenance logs';
COMMENT ON COLUMN public.work_orders.status IS 'pending, in_progress, completed, or cancelled';
COMMENT ON COLUMN public.work_orders.priority IS 'low, medium, high, or urgent';
COMMENT ON COLUMN public.comments.parent_type IS 'Type of parent entity: work_order, equipment, or maintenance_log';
COMMENT ON COLUMN public.comments.parent_id IS 'UUID of the parent entity';
