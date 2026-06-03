-- Fase 1: tett anon-skrivehull + fjern duplikat-indeks + legg manglende FK-indekser.
-- Anvendt på prosjekt ogpnmtsxodedwsmruhbc 2026-06.
-- Ikke-destruktivt: kun policyer og indekser endres, ingen data berøres.

-- 1. equipment: erstatt "temp" anon-policyer (rolle public => inkluderer anon)
--    med authenticated-versjoner. All klient-skriving kjører som authenticated.
drop policy if exists "Anyone can create equipment (temp)" on public.equipment;
drop policy if exists "Anyone can update equipment (temp)" on public.equipment;

create policy "Authenticated can create equipment"
  on public.equipment for insert
  to authenticated
  with check (true);

create policy "Authenticated can update equipment"
  on public.equipment for update
  to authenticated
  using (true)
  with check (true);

-- 2. maintenance_logs: erstatt anon-insert med authenticated-insert.
drop policy if exists "Anyone can create maintenance logs (temp)" on public.maintenance_logs;

create policy "Authenticated can create maintenance logs"
  on public.maintenance_logs for insert
  to authenticated
  with check (true);

-- 3. Fjern duplikat-indeks (idx_work_orders_equipment == idx_work_orders_equipment_id).
drop index if exists public.idx_work_orders_equipment;

-- 4. Legg manglende FK-indekser (advisor: unindexed_foreign_keys).
create index if not exists idx_equipment_created_by
  on public.equipment(created_by);
create index if not exists idx_equipment_documents_uploaded_by
  on public.equipment_documents(uploaded_by);
create index if not exists idx_maintenance_attachments_uploaded_by
  on public.maintenance_attachments(uploaded_by);
create index if not exists idx_maintenance_logs_maintenance_type_id
  on public.maintenance_logs(maintenance_type_id);
create index if not exists idx_maintenance_logs_performed_by
  on public.maintenance_logs(performed_by);
create index if not exists idx_work_order_comments_user_id
  on public.work_order_comments(user_id);
create index if not exists idx_work_orders_completed_maintenance_log_id
  on public.work_orders(completed_maintenance_log_id);
