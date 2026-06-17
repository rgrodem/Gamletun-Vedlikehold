-- Roller og tilgangsstyring. Anvendt 2026-06.
--
-- Bakgrunn: tidligere var alt "flatt" — enhver innlogget bruker kunne gjøre
-- alt (migration 010). Vi innfører nå to roller:
--   - 'admin'  : full tilgang (som i dag)
--   - 'user'   : MEDLEM — kan lese alt, melde feil og reservere utstyr, men
--                IKKE opprette/endre/slette noe annet.
--
-- VIKTIG REKKEFØLGE: Alle som finnes i dag settes til 'admin' så ingen mister
-- tilgang. Nye brukere får 'user' (medlem) ved første innlogging.
-- inge@gamletun.no settes eksplisitt til 'user' (medlem).

begin;

-- 1) Behold rolleverdiene 'admin'/'user'. Sørg for at alle eksisterende
--    brukere beholder full tilgang.
update public.profiles set role = 'admin' where role is null or role <> 'admin';

-- inge@gamletun.no skal være medlem (kjøres etter promoteringen over, så den
-- er trygg uansett om inge har logget inn før eller etter denne migrasjonen).
update public.profiles p set role = 'user'
where p.id in (select id from auth.users where lower(email) = 'inge@gamletun.no');

-- 2) Hjelpefunksjon: er innlogget bruker admin?
--    SECURITY DEFINER så den kan lese profiles uavhengig av RLS uten å åpne
--    profiles for andre.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- 3) Statusberegning som SECURITY DEFINER-funksjon.
--    Reservasjon/feilmelding må kunne oppdatere equipment.status selv om
--    medlemmer ellers ikke får skrive til equipment. Funksjonen setter KUN
--    status til en avledet verdi, så det er trygt at den kjører som definer.
create or replace function public.refresh_equipment_status(p_equipment_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
  new_status text;
begin
  select status into cur from public.equipment where id = p_equipment_id;
  if cur is null then
    return null;
  end if;

  -- 1) Aktivt arbeid (ikke lav prioritet) -> under vedlikehold
  if exists (
    select 1 from public.work_orders
    where equipment_id = p_equipment_id
      and priority <> 'low'
      and status in ('in_progress', 'waiting_parts')
  ) then
    new_status := 'maintenance';
  -- 2) Aktiv, påbegynt reservasjon -> i bruk
  elsif exists (
    select 1 from public.equipment_reservations
    where equipment_id = p_equipment_id
      and status = 'active'
      and start_time <= now()
      and (end_time is null or end_time > now())
  ) then
    new_status := 'in_use';
  -- 3) Manuelt satt ute av drift forblir inaktiv
  elsif cur = 'inactive' then
    new_status := 'inactive';
  else
    new_status := 'active';
  end if;

  update public.equipment set status = new_status where id = p_equipment_id;
  return new_status;
end;
$$;
grant execute on function public.refresh_equipment_status(uuid) to authenticated;

-- 4) Hindre at et medlem hever sin egen rolle. Trigger blokkerer
--    rolleendringer som ikke gjøres av en admin (uansett policy).
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Bare administrator kan endre rolle';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- 5) Profiles-policyer: alle kan lese; egen profil kan oppdateres (men ikke
--    rolle, jf. trigger); admin kan oppdatere/sette inn alle.
--    Dropper både gamle OG nye navn først, så migrasjonen tåler å kjøres flere
--    ganger (idempotent).
drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;
drop policy if exists "Anyone can view profiles" on public.profiles;
drop policy if exists "Self or admin update profile" on public.profiles;
drop policy if exists "Self insert as member" on public.profiles;
drop policy if exists "Admin insert profile" on public.profiles;

create policy "Anyone can view profiles" on public.profiles
  for select to authenticated using (true);
create policy "Self or admin update profile" on public.profiles
  for update to authenticated using (auth.uid() = id or public.is_admin());
-- Selvopprettelse ved første innlogging: kun egen rad og kun som medlem.
create policy "Self insert as member" on public.profiles
  for insert to authenticated with check (auth.uid() = id and role = 'user');
create policy "Admin insert profile" on public.profiles
  for insert to authenticated with check (public.is_admin());

-- 6) Hjelper: lås en tabell til "alle kan lese, kun admin kan endre".
--    Vi sletter ALLE eksisterende policyer på tabellen først (deterministisk —
--    da blir det ingen gamle, romslige policyer igjen) og bygger på nytt.
create or replace function public._lock_table_admin_only(tbl text)
returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
    execute format('drop policy %I on public.%I', r.policyname, tbl);
  end loop;
  execute format('alter table public.%I enable row level security', tbl);
  execute format('create policy "view_all" on public.%I for select to authenticated using (true)', tbl);
  execute format('create policy "admin_insert" on public.%I for insert to authenticated with check (public.is_admin())', tbl);
  execute format('create policy "admin_update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', tbl);
  execute format('create policy "admin_delete" on public.%I for delete to authenticated using (public.is_admin())', tbl);
end;
$$;

-- Tabeller som KUN admin skal kunne endre (medlemmer leser):
select public._lock_table_admin_only('equipment');
select public._lock_table_admin_only('categories');
select public._lock_table_admin_only('maintenance_types');
select public._lock_table_admin_only('maintenance_logs');
select public._lock_table_admin_only('work_order_comments');
select public._lock_table_admin_only('work_order_parts');
select public._lock_table_admin_only('parts');
select public._lock_table_admin_only('part_equipment_compat');
select public._lock_table_admin_only('stock_movements');
select public._lock_table_admin_only('inventory_items');
select public._lock_table_admin_only('inventory_loans');
select public._lock_table_admin_only('equipment_documents');
select public._lock_table_admin_only('maintenance_attachments');

drop function public._lock_table_admin_only(text);

-- 7) work_orders: medlemmer kan MELDE FEIL (opprette type 'corrective'),
--    men ikke endre/slette eller lage planlagt vedlikehold.
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='work_orders' loop
    execute format('drop policy %I on public.work_orders', r.policyname);
  end loop;
end $$;
alter table public.work_orders enable row level security;
create policy "view_all" on public.work_orders
  for select to authenticated using (true);
create policy "insert fault or admin" on public.work_orders
  for insert to authenticated
  with check (public.is_admin() or type = 'corrective');
create policy "admin_update" on public.work_orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_delete" on public.work_orders
  for delete to authenticated using (public.is_admin());

-- 8) work_order_attachments: medlemmer kan legge ved foto (feilmelding),
--    men ikke slette.
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='work_order_attachments' loop
    execute format('drop policy %I on public.work_order_attachments', r.policyname);
  end loop;
end $$;
alter table public.work_order_attachments enable row level security;
create policy "view_all" on public.work_order_attachments
  for select to authenticated using (true);
create policy "auth_insert" on public.work_order_attachments
  for insert to authenticated with check (auth.role() = 'authenticated');
create policy "admin_delete" on public.work_order_attachments
  for delete to authenticated using (public.is_admin());

-- 9) equipment_reservations: medlemmer kan reservere og styre EGNE
--    reservasjoner; admin kan styre alle.
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='equipment_reservations' loop
    execute format('drop policy %I on public.equipment_reservations', r.policyname);
  end loop;
end $$;
alter table public.equipment_reservations enable row level security;
create policy "view_all" on public.equipment_reservations
  for select to authenticated using (true);
create policy "insert own" on public.equipment_reservations
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "update own or admin" on public.equipment_reservations
  for update to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "delete own or admin" on public.equipment_reservations
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

commit;

-- MERK: Storage-bucket-policyer (foto/dokumenter) styres separat i Supabase
-- Storage og er ikke endret her. Medlemmer kan fortsatt laste opp feilfoto.
-- Vil du hindre at medlemmer sletter filer, kan det strammes i Storage-policyene.
