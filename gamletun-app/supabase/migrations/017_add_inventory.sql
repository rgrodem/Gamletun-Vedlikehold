-- Lager/utlån med antall per deltype — for utstyr som ikke lånes ut som én
-- enhet, men i antall (f.eks. stillasdeler: 100 plattinger, 60 rammer …).
-- En "deltype" (inventory_items) har et totalt antall. Hvert utlån
-- (inventory_loans) tar et antall til en navngitt låner. Tilgjengelig =
-- totalt − sum(aktive utlån).

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_equipment
  ON public.inventory_items(equipment_id);

CREATE TABLE IF NOT EXISTS public.inventory_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned')),
  note TEXT,
  loaned_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_loans_item
  ON public.inventory_loans(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_loans_status
  ON public.inventory_loans(status);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_loans ENABLE ROW LEVEL SECURITY;

-- Flat tilgangsmodell (som resten av appen): alle innloggede kan administrere.
CREATE POLICY "Authenticated can view inventory items"
  ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add inventory items"
  ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update inventory items"
  ON public.inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete inventory items"
  ON public.inventory_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view inventory loans"
  ON public.inventory_loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add inventory loans"
  ON public.inventory_loans FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update inventory loans"
  ON public.inventory_loans FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete inventory loans"
  ON public.inventory_loans FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.inventory_items IS 'Deltyper med antall (f.eks. stillasdeler)';
COMMENT ON TABLE public.inventory_loans IS 'Utlån av et antall av en deltype til en navngitt låner';
