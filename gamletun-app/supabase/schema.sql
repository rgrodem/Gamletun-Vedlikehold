-- Gamletun Vedlikehold Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify categories"
  ON public.categories FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Equipment table
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  model TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_by UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view equipment"
  ON public.equipment FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create equipment"
  ON public.equipment FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update equipment"
  ON public.equipment FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete equipment"
  ON public.equipment FOR DELETE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Maintenance Types table
CREATE TABLE IF NOT EXISTS public.maintenance_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment ON DELETE CASCADE NOT NULL,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(equipment_id, type_name)
);

ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view maintenance types"
  ON public.maintenance_types FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage maintenance types"
  ON public.maintenance_types FOR ALL
  USING (auth.role() = 'authenticated');

-- Maintenance Logs table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment ON DELETE CASCADE NOT NULL,
  maintenance_type_id UUID REFERENCES public.maintenance_types ON DELETE SET NULL,
  description TEXT,
  performed_by UUID REFERENCES public.profiles ON DELETE SET NULL NOT NULL,
  performed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view maintenance logs"
  ON public.maintenance_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create maintenance logs"
  ON public.maintenance_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own maintenance logs"
  ON public.maintenance_logs FOR UPDATE
  USING (performed_by = auth.uid());

CREATE POLICY "Users can delete own maintenance logs"
  ON public.maintenance_logs FOR DELETE
  USING (performed_by = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_equipment ON public.maintenance_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_performed_date ON public.maintenance_logs(performed_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_types_equipment ON public.maintenance_types(equipment_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_equipment_updated_at ON public.equipment;
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_logs_updated_at ON public.maintenance_logs;
CREATE TRIGGER update_maintenance_logs_updated_at
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default categories
INSERT INTO public.categories (name, icon, color) VALUES
  ('Gravemaskiner', '🏗️', '#f59e0b'),
  ('Tilhengere', '🚚', '#3b82f6'),
  ('Traktorer', '🚜', '#10b981'),
  ('Lift', '⬆️', '#8b5cf6'),
  ('Biler', '🚗', '#6366f1'),
  ('Annet', '⚙️', '#6b7280')
ON CONFLICT (name) DO NOTHING;
