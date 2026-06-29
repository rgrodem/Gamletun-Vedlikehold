-- Manualer + søk (RAG, Fase 1 MVP). Anvendt 2026-06.
--
-- MVP-omfang: opplasting av PDF-manualer per maskin, tekstuttrekk + chunking
-- (gjøres i app-ruten med unpdf), og søk via Postgres fulltekst. Semantisk
-- vektorsøk (pgvector/embeddings) kommer i en senere migrasjon — derfor er det
-- ikke med her, så MVP-en kjører uten nye eksterne tjenester.

begin;

-- En manual. Knyttes til én eller flere maskiner via manual_machines.
create table if not exists public.manuals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  make        text,
  model       text,
  manual_type text default 'verksted',  -- 'verksted' | 'service' | 'bruker' | 'deler'
  language    text default 'no',
  file_path   text not null,            -- Storage: manuals/<id>/<filnavn>.pdf
  page_count  int,
  status      text not null default 'uploaded'
              check (status in ('uploaded','parsing','ready','failed')),
  error       text,
  uploaded_by uuid references public.profiles,
  created_at  timestamptz default now()
);

create table if not exists public.manual_machines (
  manual_id    uuid references public.manuals on delete cascade,
  equipment_id uuid references public.equipment on delete cascade,
  primary key (manual_id, equipment_id)
);
create index if not exists manual_machines_equipment_idx on public.manual_machines (equipment_id);

-- Søkbare tekstbiter. tsv er en generert fulltekst-kolonne (norsk/teknisk tekst
-- søkes med 'simple'-konfig — ingen stemming, men eksakte ord matcher godt).
create table if not exists public.manual_chunks (
  id          uuid primary key default gen_random_uuid(),
  manual_id   uuid not null references public.manuals on delete cascade,
  chunk_index int not null,
  page_from   int,
  page_to     int,
  content     text not null,
  tsv         tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at  timestamptz default now()
);
create index if not exists manual_chunks_tsv_idx on public.manual_chunks using gin (tsv);
create index if not exists manual_chunks_manual_idx on public.manual_chunks (manual_id);

-- Logg av spørsmål/svar (audit + ev. innsikt).
create table if not exists public.manual_queries (
  id           uuid primary key default gen_random_uuid(),
  equipment_id uuid references public.equipment on delete set null,
  user_id      uuid references public.profiles on delete set null,
  question     text not null,
  answer       text,
  found        boolean,
  created_at   timestamptz default now()
);

-- RLS: alle innlogget kan lese; kun admin kan endre (samme mønster som migr. 020).
alter table public.manuals enable row level security;
alter table public.manual_machines enable row level security;
alter table public.manual_chunks enable row level security;
alter table public.manual_queries enable row level security;

drop policy if exists "manuals_view" on public.manuals;
drop policy if exists "manuals_admin_ins" on public.manuals;
drop policy if exists "manuals_admin_upd" on public.manuals;
drop policy if exists "manuals_admin_del" on public.manuals;
create policy "manuals_view"      on public.manuals for select to authenticated using (true);
create policy "manuals_admin_ins" on public.manuals for insert to authenticated with check (public.is_admin());
create policy "manuals_admin_upd" on public.manuals for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "manuals_admin_del" on public.manuals for delete to authenticated using (public.is_admin());

drop policy if exists "mm_view" on public.manual_machines;
drop policy if exists "mm_admin_ins" on public.manual_machines;
drop policy if exists "mm_admin_del" on public.manual_machines;
create policy "mm_view"      on public.manual_machines for select to authenticated using (true);
create policy "mm_admin_ins" on public.manual_machines for insert to authenticated with check (public.is_admin());
create policy "mm_admin_del" on public.manual_machines for delete to authenticated using (public.is_admin());

drop policy if exists "mc_view" on public.manual_chunks;
drop policy if exists "mc_admin_ins" on public.manual_chunks;
drop policy if exists "mc_admin_del" on public.manual_chunks;
create policy "mc_view"      on public.manual_chunks for select to authenticated using (true);
create policy "mc_admin_ins" on public.manual_chunks for insert to authenticated with check (public.is_admin());
create policy "mc_admin_del" on public.manual_chunks for delete to authenticated using (public.is_admin());

drop policy if exists "mq_view" on public.manual_queries;
drop policy if exists "mq_ins" on public.manual_queries;
create policy "mq_view" on public.manual_queries for select to authenticated using (true);
create policy "mq_ins"  on public.manual_queries for insert to authenticated with check (user_id = auth.uid() or public.is_admin());

-- Fulltekst-søk i KUN denne maskinens ferdig-indekserte manualer.
create or replace function public.search_manual_chunks(
  p_equipment_id uuid,
  p_query text,
  p_limit int default 8
)
returns table (
  chunk_id uuid, manual_id uuid, manual_title text,
  page_from int, page_to int, content text, rank real
)
language sql stable as $$
  select c.id, c.manual_id, m.title, c.page_from, c.page_to, c.content,
         ts_rank_cd(c.tsv, websearch_to_tsquery('simple', p_query)) as rank
  from public.manual_chunks c
  join public.manuals m on m.id = c.manual_id
  join public.manual_machines mm on mm.manual_id = c.manual_id
  where mm.equipment_id = p_equipment_id
    and m.status = 'ready'
    and c.tsv @@ websearch_to_tsquery('simple', p_query)
  order by rank desc
  limit p_limit;
$$;
grant execute on function public.search_manual_chunks(uuid, text, int) to authenticated;

-- Privat storage-bucket for manual-PDF-er + tilgangsregler.
insert into storage.buckets (id, name, public)
values ('manuals', 'manuals', false)
on conflict (id) do nothing;

drop policy if exists "manuals_storage_read" on storage.objects;
drop policy if exists "manuals_storage_write" on storage.objects;
drop policy if exists "manuals_storage_delete" on storage.objects;
create policy "manuals_storage_read"   on storage.objects for select to authenticated using (bucket_id = 'manuals');
create policy "manuals_storage_write"  on storage.objects for insert to authenticated with check (bucket_id = 'manuals' and public.is_admin());
create policy "manuals_storage_delete" on storage.objects for delete to authenticated using (bucket_id = 'manuals' and public.is_admin());

commit;
