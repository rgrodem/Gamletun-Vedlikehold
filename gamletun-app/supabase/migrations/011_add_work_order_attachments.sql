-- Bildevedlegg på arbeidsordrer/feilmeldinger.
-- Filene lagres i den eksisterende storage-bucketen 'maintenance-attachments'
-- under mappen work-orders/<work_order_id>/, så ingen ny bucket trengs.

CREATE TABLE IF NOT EXISTS public.work_order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_attachments_work_order_id
  ON public.work_order_attachments(work_order_id);

ALTER TABLE public.work_order_attachments ENABLE ROW LEVEL SECURITY;

-- Flat tilgangsmodell: alle innloggede brukere kan se og legge til vedlegg.
CREATE POLICY "Authenticated can view work order attachments"
  ON public.work_order_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can add work order attachments"
  ON public.work_order_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete work order attachments"
  ON public.work_order_attachments FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE public.work_order_attachments IS
  'Bilder/filer knyttet til arbeidsordrer (f.eks. foto av en meldt feil)';
