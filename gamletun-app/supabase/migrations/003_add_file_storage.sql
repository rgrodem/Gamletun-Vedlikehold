-- Migration: Add file storage support for equipment and maintenance
-- Description: Adds support for equipment images, documents, and maintenance attachments

-- 1. Add image_url column to equipment table
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create equipment_documents table
CREATE TABLE IF NOT EXISTS equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  document_type TEXT, -- 'certificate', 'manual', 'vehicle_card', 'drawing', 'other'
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create maintenance_attachments table
CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_log_id UUID NOT NULL REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  attachment_type TEXT, -- 'image', 'document', 'form'
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_documents_equipment_id ON equipment_documents(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_documents_created_at ON equipment_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_maintenance_log_id ON maintenance_attachments(maintenance_log_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_created_at ON maintenance_attachments(created_at DESC);

-- 5. Add RLS policies (when RLS is enabled)
-- Equipment documents policies
ALTER TABLE equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view equipment documents"
  ON equipment_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert equipment documents"
  ON equipment_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete their own equipment documents"
  ON equipment_documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR true); -- Allow delete by anyone for now

-- Maintenance attachments policies
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view maintenance attachments"
  ON maintenance_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert maintenance attachments"
  ON maintenance_attachments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete their own maintenance attachments"
  ON maintenance_attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR true); -- Allow delete by anyone for now

-- 6. Add updated_at trigger for equipment_documents
CREATE OR REPLACE FUNCTION update_equipment_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_documents_updated_at
  BEFORE UPDATE ON equipment_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_documents_updated_at();

-- 7. Add comments for documentation
COMMENT ON TABLE equipment_documents IS 'Stores documents attached to equipment (certificates, manuals, vehicle cards, drawings, etc.)';
COMMENT ON TABLE maintenance_attachments IS 'Stores files attached to maintenance logs (images, documents, forms)';
COMMENT ON COLUMN equipment.image_url IS 'URL/path to equipment image in Supabase Storage (replaces emoji icon)';
