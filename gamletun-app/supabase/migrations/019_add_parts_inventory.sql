-- Reservedels-/varelagermodul.
-- Delekatalog + lagerbevegelses-hovedbok (ledger) + del↔utstyr-kompatibilitet.
-- Beholdning (current_stock) caches via trigger fra stock_movements.

CREATE TABLE IF NOT EXISTS public.parts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  part_number   TEXT,
  ean           TEXT,
  description   TEXT,
  category      TEXT,
  -- 'consumable' = felles forbrukslager (olje), 'equipment_specific' = knyttet til utstyr (filtre)
  part_type     TEXT NOT NULL DEFAULT 'consumable'
                CHECK (part_type IN ('consumable', 'equipment_specific')),
  unit          TEXT NOT NULL DEFAULT 'stk'
                CHECK (unit IN ('stk', 'liter', 'meter', 'kg')),
  location      TEXT,
  min_stock     NUMERIC(10,3) NOT NULL DEFAULT 0,
  current_stock NUMERIC(10,3) NOT NULL DEFAULT 0,  -- trigger-vedlikeholdt cache
  unit_cost     NUMERIC(10,2),                      -- siste/snitt innkjøpspris
  image_url     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parts_category_idx ON public.parts(category);
CREATE INDEX IF NOT EXISTS parts_name_idx ON public.parts(name);
CREATE INDEX IF NOT EXISTS parts_ean_idx ON public.parts(ean) WHERE ean IS NOT NULL;

-- Mange-til-mange: hvilke deler passer hvilke maskiner (løser «hva passer dette filteret til?»).
CREATE TABLE IF NOT EXISTS public.part_equipment_compat (
  part_id      UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  notes        TEXT,
  PRIMARY KEY (part_id, equipment_id)
);
CREATE INDEX IF NOT EXISTS pec_equipment_idx ON public.part_equipment_compat(equipment_id);

-- Lagerbevegelser — append-only hovedbok.
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id            UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  movement_type      TEXT NOT NULL
                     CHECK (movement_type IN ('in', 'out', 'correction', 'return')),
  quantity           NUMERIC(10,3) NOT NULL,  -- alltid positiv; retning tolkes via type
  unit_cost          NUMERIC(10,2),
  work_order_id      UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  maintenance_log_id UUID REFERENCES public.maintenance_logs(id) ON DELETE SET NULL,
  equipment_id       UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  performed_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sm_part_idx ON public.stock_movements(part_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sm_equipment_idx ON public.stock_movements(equipment_id) WHERE equipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sm_work_order_idx ON public.stock_movements(work_order_id) WHERE work_order_id IS NOT NULL;

-- Oppdater parts.current_stock etter hver bevegelse (også ved sletting).
-- Konvensjon: in/out/return lagres med POSITIV quantity. 'correction' lagres
-- med FORTEGN (positiv = legg til, negativ = trekk fra) — brukes ved inventur,
-- der app-laget setter quantity = (talt antall − nåværende beholdning).
CREATE OR REPLACE FUNCTION public.recalc_part_stock(p_part_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.parts SET
    current_stock = (
      SELECT COALESCE(SUM(
        CASE
          WHEN movement_type IN ('in', 'return') THEN quantity
          WHEN movement_type = 'out'             THEN -quantity
          WHEN movement_type = 'correction'      THEN quantity
          ELSE 0
        END), 0)
      FROM public.stock_movements WHERE part_id = p_part_id
    ),
    updated_at = now()
  WHERE id = p_part_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_part_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.recalc_part_stock(COALESCE(NEW.part_id, OLD.part_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS stock_movements_recalc ON public.stock_movements;
CREATE TRIGGER stock_movements_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_part_stock();

-- View: deler under minimumsbeholdning (brukes av lavt-lager-varsel).
CREATE OR REPLACE VIEW public.parts_low_stock AS
SELECT p.*, (p.min_stock - p.current_stock) AS stock_gap
FROM public.parts p
WHERE p.min_stock > 0 AND p.current_stock <= p.min_stock;

-- RLS — flat modell (alle innloggede kan administrere), som resten av appen.
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_equipment_compat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update parts" ON public.parts FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete parts" ON public.parts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view compat" ON public.part_equipment_compat FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add compat" ON public.part_equipment_compat FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete compat" ON public.part_equipment_compat FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete movements" ON public.stock_movements FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.parts IS 'Delekatalog: forbruksmateriell og utstyrsspesifikke deler';
COMMENT ON TABLE public.stock_movements IS 'Lagerbevegelser (hovedbok): in/out/correction/return';
COMMENT ON TABLE public.part_equipment_compat IS 'Hvilke deler passer hvilke utstyr (mange-til-mange)';
