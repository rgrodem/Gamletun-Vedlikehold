-- Add 'in_use' status to equipment
ALTER TYPE equipment_status ADD VALUE IF NOT EXISTS 'in_use';

-- Create equipment_reservations table
CREATE TABLE IF NOT EXISTS public.equipment_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_equipment_id ON public.equipment_reservations(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_user_id ON public.equipment_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_status ON public.equipment_reservations(status);
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_time_range ON public.equipment_reservations(start_time, end_time);

-- Enable RLS
ALTER TABLE public.equipment_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reservations"
  ON public.equipment_reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reservations"
  ON public.equipment_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations"
  ON public.equipment_reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations"
  ON public.equipment_reservations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update equipment status when reservation starts
CREATE OR REPLACE FUNCTION public.update_equipment_status_on_reservation()
RETURNS TRIGGER AS $$
BEGIN
  -- If reservation is starting now or in the past, and status is active
  IF NEW.status = 'active' AND NEW.start_time <= NOW() THEN
    UPDATE public.equipment
    SET status = 'in_use'
    WHERE id = NEW.equipment_id
      AND status = 'active'; -- Only change if currently active
  END IF;

  -- If reservation is completed or cancelled, check if we should set back to active
  IF (NEW.status = 'completed' OR NEW.status = 'cancelled') AND
     (OLD.status = 'active') THEN
    -- Check if there are any other active reservations for this equipment
    IF NOT EXISTS (
      SELECT 1 FROM public.equipment_reservations
      WHERE equipment_id = NEW.equipment_id
        AND status = 'active'
        AND start_time <= NOW()
        AND (end_time IS NULL OR end_time > NOW())
        AND id != NEW.id
    ) THEN
      -- No other active reservations, set back to active
      UPDATE public.equipment
      SET status = 'active'
      WHERE id = NEW.equipment_id
        AND status = 'in_use';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update equipment status
DROP TRIGGER IF EXISTS trg_update_equipment_status_on_reservation ON public.equipment_reservations;
CREATE TRIGGER trg_update_equipment_status_on_reservation
  AFTER INSERT OR UPDATE ON public.equipment_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_equipment_status_on_reservation();

-- Function to automatically complete reservations when end_time is reached
CREATE OR REPLACE FUNCTION public.auto_complete_reservations()
RETURNS void AS $$
BEGIN
  UPDATE public.equipment_reservations
  SET status = 'completed',
      updated_at = NOW()
  WHERE status = 'active'
    AND end_time IS NOT NULL
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The auto_complete_reservations function should be called periodically
-- You can set up a cron job or call it from your application
