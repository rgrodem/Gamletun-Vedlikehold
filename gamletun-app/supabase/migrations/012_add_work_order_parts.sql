-- Deleliste på arbeidsordrer: hvilke reservedeler trengs, og status på dem.
-- Gjør «Venter deler» konkret: man ser HVA man venter på.

CREATE TABLE IF NOT EXISTS public.work_order_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'ordered', 'received')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_parts_work_order_id
  ON public.work_order_parts(work_order_id);

ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;

-- Flat tilgangsmodell: alle innloggede brukere kan administrere deler.
CREATE POLICY "Authenticated can view work order parts"
  ON public.work_order_parts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can add work order parts"
  ON public.work_order_parts FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update work order parts"
  ON public.work_order_parts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete work order parts"
  ON public.work_order_parts FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE public.work_order_parts IS
  'Reservedeler knyttet til en arbeidsordre (trengs/bestilt/mottatt)';
