# RAG-basert manual- og reparasjonsassistent — teknisk vurdering

Forankret i stacken appen allerede bruker: **Next.js 15 (App Router) på Vercel**,
**Supabase (Postgres + Storage + RLS)**, **Claude (Anthropic)** via
`lib/anthropic.ts` med tvunget tool-use for strukturert JSON. Målet er en
praktisk reparasjons-/serviceassistent knyttet til hver maskin — ikke en chatbot.

---

## 0. Sammendrag og anbefalt stack

| Lag | Anbefaling | Hvorfor |
|-----|-----------|---------|
| Vektorlager | **pgvector i Supabase** (ikke OpenSearch/egen DB) | Én stack, RLS-isolasjon per maskin/gård, transaksjonelt med metadata. Holder til hundretusenvis av chunks. |
| Embeddings | **Voyage AI** (`voyage-3` / `voyage-multilingual-2`) | Claude har ikke embeddings. Voyage er Anthropics anbefalte par, god på norsk + teknisk tekst. Alt: OpenAI `text-embedding-3-small`. |
| Generering | **Claude** (Sonnet) med **Citations** + tool-use JSON | Citations gir kildeforankrede svar med eksakt plassering → kjernen i anti-hallucination. |
| PDF-parsing | **Worker med PyMuPDF** (egen liten tjeneste) **eller** managed (LlamaParse/Document AI) | Tekst + tabeller + figurer + sidebilder. For tungt for Vercel-serverless. |
| Jobbkø/indeksering | **Inngest** (eller Trigger.dev) | Durable, fleretrinns, retries — passer Vercel. Alt: Supabase Queues (pgmq) + worker. |
| PDF-generering | **@react-pdf/renderer** (fast mal fra JSON) | Deterministisk layout; AI lager aldri PDF-en fritt. |

**Svar på «må jeg vurdere noe annet enn Supabase?»:** Nei for selve lagring/søk —
pgvector dekker dette godt. De eneste eksterne tjenestene du faktisk trenger er
(1) en embeddings-leverandør og (2) en PDF-parser/worker og (3) en jobbkø. Disse
er små, veldefinerte tillegg, ikke en ny plattform.

---

## 1. Arkitektur i lag (A–E) kartlagt mot stacken

```
[Opplasting PDF] → Storage (bucket: manuals)
        │
        ▼
[Inngest: indekseringsjobb]
   1. last ned PDF
   2. parse (PyMuPDF/LlamaParse): tekst pr side, tabeller, figurer, sidebilder
   3. chunk (seksjons-/sidebevisst, 300–800 tokens, overlap)
   4. lagre figurer → Storage (bucket: manual-figures)
   5. embed chunks (Voyage, batch)
   6. upsert → manual_chunks / manual_figures / manual_pages
   7. manuals.status = 'ready'
        │
        ▼
[Bruker spør i maskinvisningen]
        │
        ▼
[/api/manuals/ask | /repair-guide]
   a. lag spørrings-embedding
   b. HYBRID søk i pgvector (vektor + fulltekst, RRF), FILTRERT på maskinens manualer
   c. send KUN topp-K chunks (+ figurer) til Claude med Citations
   d. Claude → svar med kilder  ELLER  strukturert reparasjons-JSON
        │
        ▼
[PDF-motor: @react-pdf/renderer]  → Storage (bucket: repair-guides)
        │
        ▼
[Lagre mot maskin: repair_guides → ev. work_order / maintenance_log]
```

Den eksisterende `app/api/ai/parse-document`-ruten (hele PDF rett til Claude)
fungerer for *små* dokumenter, men sprenger kontekst og blir dyrt/upresist for
verkstedmanualer på hundrevis av sider. Derfor RAG: hent ut *relevante* sider
først, send bare dem til Claude.

---

## 2. Database-schema (Postgres + pgvector)

```sql
create extension if not exists vector;      -- pgvector
create extension if not exists pg_trgm;     -- fuzzy eksaktmatch (delenr/feilkoder)

-- En manual. Kan gjelde én konkret maskin ELLER en modell (deles av flere).
create table public.manuals (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  make          text,                 -- merke
  model         text,                 -- modell
  year_from     int,
  year_to       int,
  variant       text,                 -- serienr-serie / variant
  manual_type   text,                 -- 'verksted' | 'service' | 'bruker' | 'deler'
  language      text default 'no',
  file_path     text not null,        -- Storage: manuals/<id>/original.pdf
  file_hash     text,                 -- dedupe
  page_count    int,
  status        text not null default 'uploaded'
                check (status in ('uploaded','parsing','ready','failed')),
  error         text,
  uploaded_by   uuid references public.profiles,
  created_at    timestamptz default now()
);

-- Mange-til-mange: hvilke maskiner en manual gjelder.
create table public.manual_machines (
  manual_id    uuid references public.manuals on delete cascade,
  equipment_id uuid references public.equipment on delete cascade,
  primary key (manual_id, equipment_id)
);

-- Søkbare tekstbiter. embedding-dim følger valgt modell (Voyage-3 = 1024).
create table public.manual_chunks (
  id           uuid primary key default gen_random_uuid(),
  manual_id    uuid not null references public.manuals on delete cascade,
  chunk_index  int not null,
  page_from    int,
  page_to      int,
  chapter      text,
  section      text,
  heading      text,
  content      text not null,
  token_count  int,
  embedding    halfvec(1024),         -- halfvec sparer plass; HNSW-indeks under
  tsv          tsvector,              -- fulltekst (norsk + engelsk)
  meta         jsonb default '{}'::jsonb
);

create index on public.manual_chunks using hnsw (embedding halfvec_cosine_ops);
create index on public.manual_chunks using gin (tsv);
create index on public.manual_chunks using gin (content gin_trgm_ops);
create index on public.manual_chunks (manual_id);

-- Figurer/illustrasjoner trukket ut av PDF-en.
create table public.manual_figures (
  id           uuid primary key default gen_random_uuid(),
  manual_id    uuid not null references public.manuals on delete cascade,
  page         int,
  figure_index int,
  image_path   text not null,         -- Storage: manual-figures/<manual>/<id>.png
  caption      text,
  bbox         jsonb,                 -- posisjon på siden
  near_chunk_id uuid references public.manual_chunks
);

-- Render av hele sider (for «vis manualside» + som kilde-anker).
create table public.manual_pages (
  id          uuid primary key default gen_random_uuid(),
  manual_id   uuid not null references public.manuals on delete cascade,
  page_number int not null,
  image_path  text,                   -- Storage: manual-pages/<manual>/<n>.png
  text        text,
  unique (manual_id, page_number)
);

-- Generert reparasjons-/serviceguide (strukturert JSON + ev. PDF).
create table public.repair_guides (
  id            uuid primary key default gen_random_uuid(),
  equipment_id  uuid references public.equipment on delete cascade,
  question      text not null,
  guide         jsonb not null,        -- JSON-schemaet i §8
  pdf_path      text,
  status        text default 'draft' check (status in ('draft','approved')),
  work_order_id uuid references public.work_orders,
  created_by    uuid references public.profiles,
  created_at    timestamptz default now()
);

-- Logg av spørsmål/svar (audit + ev. caching).
create table public.manual_queries (
  id           uuid primary key default gen_random_uuid(),
  equipment_id uuid references public.equipment,
  user_id      uuid references public.profiles,
  question     text not null,
  answer       text,
  sources      jsonb,
  created_at   timestamptz default now()
);
```

`halfvec` (16-bit) halverer lagring vs `vector` med ubetydelig presisjonstap, og
HNSW gir rask ANN-søk. 1024 dim = Voyage-3; bytt dim hvis du velger annen modell.

---

## 3. Lagring av filer, chunks, bilder, kilder

**Supabase Storage (private buckets, signerte URL-er):**
```
manuals/<manual_id>/original.pdf
manual-pages/<manual_id>/<page>.png         (renderte sider)
manual-figures/<manual_id>/<figure_id>.png  (utklipte figurer)
repair-guides/<guide_id>.pdf
```
- Aldri offentlige buckets. Klienten får tidsbegrensede signerte URL-er via API.
- **Kilde = (manual_id, chapter, page_from–page_to, chunk_id)**. Alt henger sammen
  via `manual_chunks`; en kildehenvisning kan da peke til manualnavn + kapittel +
  side, og samtidig lenke til `manual_pages`-bildet for «vis siden».

---

## 4. pgvector vs OpenSearch vs egen vektor-DB

| | pgvector (Supabase) | OpenSearch | Pinecone/Weaviate |
|--|--|--|--|
| Ops | Null ekstra (har det allerede) | Egen klynge å drifte | Ekstra leverandør |
| RLS/isolasjon | Ja, native i Postgres | Manuelt | Manuelt/metadata |
| Hybrid søk | Vektor + FTS (RRF) i SQL | Sterk hybrid out-of-box | Varierer |
| Skala | 10⁵–10⁶ chunks fint med HNSW | Millioner+ | Millioner+ |
| Når bytte | — | Multi-region, >1–5M chunks, avansert BM25 | Hvis du vil unngå DB-drift |

**Anbefaling: pgvector.** Du har realistisk noen titalls maskiner × noen manualer
× hundrevis av sider = titusener–hundretusener chunks. Det er godt innenfor
pgvector + HNSW. Bytt aldri «for sikkerhets skyld» — det koster ops og mister
RLS-fordelen. Vurder OpenSearch først ved millioner av chunks eller behov for
avansert BM25/aggregeringer.

---

## 5. Hybrid søk (RRF) som SQL-funksjon

```sql
-- Kombinerer vektor-likhet og fulltekst med Reciprocal Rank Fusion, filtrert
-- på maskinens manualer. Vekter eksakte treff (delenr/feilkode) via FTS.
create or replace function public.match_manual_chunks(
  p_equipment_id uuid,
  p_query_embedding halfvec(1024),
  p_query_text text,
  p_match_count int default 12
)
returns table (
  chunk_id uuid, manual_id uuid, content text,
  chapter text, page_from int, page_to int, score float
)
language sql stable as $$
with scope as (
  select c.*
  from manual_chunks c
  join manual_machines mm on mm.manual_id = c.manual_id
  where mm.equipment_id = p_equipment_id
),
vec as (
  select id, row_number() over (order by embedding <=> p_query_embedding) rnk
  from scope order by embedding <=> p_query_embedding limit 50
),
fts as (
  select id, row_number() over (
    order by ts_rank_cd(tsv, websearch_to_tsquery('simple', p_query_text)) desc
  ) rnk
  from scope
  where tsv @@ websearch_to_tsquery('simple', p_query_text)
  limit 50
)
select s.id, s.manual_id, s.content, s.chapter, s.page_from, s.page_to,
       coalesce(1.0/(60+v.rnk),0) + coalesce(1.0/(60+f.rnk),0) as score
from scope s
left join vec v on v.id = s.id
left join fts f on f.id = s.id
where v.id is not null or f.id is not null
order by score desc
limit p_match_count;
$$;
```
- `60` er RRF-konstanten (k). Juster `match_count` etter hvor mye kontekst Claude
  skal få. For eksaktmatch (momentverdier, serviceintervall) gjør FTS-grenen mye
  av jobben; du kan i tillegg legge en regex/`pg_trgm`-gren for delenummer.

---

## 6. AI-lag: prompt, Citations og anti-hallucination

**Kjerneprinsipp:** modellen får KUN de hentede chunks, og instrueres til å nekte
å svare utover dem. To mekanismer i kombinasjon:

1. **Anthropic Citations** — send chunkene som `document`-blokker; Claude
   returnerer svaret med eksakte siterte tekstspenn. Steg uten sitat kan du
   programmatisk flagge/forkaste.
2. **Tool-use strukturert JSON** (som `lib/anthropic.ts` allerede gjør) der hvert
   steg MÅ ha `source_refs`, og et eget `missing_info`-felt.

**System-prompt (skisse):**
```
Du er en teknisk reparasjons- og serviceassistent for maskiner og kjøretøy.
Svar KUN basert på de oppgitte kildeutdragene fra denne maskinens manualer.
- Finner du ikke svaret i kildene: si tydelig «Dette står ikke i kildematerialet»
  og fyll missing_info. IKKE gjett.
- Aldri finn på momentverdier, oljetyper, mengder, serviceintervaller eller
  delenummer. Slike skal siteres ordrett fra kilde, ellers utelates.
- Hvert steg skal referere minst én kilde (source_refs).
- Svar på norsk. Behold tekniske termer og tall presist.
```
**User-melding:** spørsmålet + chunkene, hver merket `[Kilde N: <manual>, kap. <x>, s. <y>]`.

**Flere guardrails:**
- Hvis hybrid-søket ikke gir treff over en likhetsterskel → svar «ikke funnet i
  kildematerialet», ikke kall modellen i det hele tatt.
- `temperature: 0`.
- Etterbehandling: dropp `steps[]` og `torque_specs[]` uten gyldig `source_refs`.
- Vis alltid kildene i UI, med lenke til manualsiden (`manual_pages`-bilde).

---

## 7. JSON-schema for reparasjonsguide (tool input_schema)

```json
{
  "type": "object",
  "properties": {
    "repair_title": { "type": "string" },
    "summary": { "type": "string" },
    "warnings": { "type": "array", "items": { "type": "string" } },
    "tools": { "type": "array", "items": { "type": "string" } },
    "parts": { "type": "array", "items": {
      "type": "object",
      "properties": { "name": {"type":"string"}, "part_number": {"type":["string","null"]}, "qty": {"type":["string","null"]} },
      "required": ["name"] } },
    "fluids": { "type": "array", "items": {
      "type": "object",
      "properties": { "name": {"type":"string"}, "spec": {"type":["string","null"]}, "amount": {"type":["string","null"]} },
      "required": ["name"] } },
    "steps": { "type": "array", "items": {
      "type": "object",
      "properties": {
        "n": {"type":"integer"},
        "instruction": {"type":"string"},
        "image_refs": {"type":"array","items":{"type":"string"}},
        "torque": {"type":["string","null"]},
        "source_refs": {"type":"array","items":{"type":"string"}}
      },
      "required": ["n","instruction","source_refs"] } },
    "torque_specs": { "type": "array", "items": {
      "type": "object",
      "properties": { "fastener":{"type":"string"}, "value":{"type":"string"}, "source_ref":{"type":"string"} },
      "required": ["fastener","value","source_ref"] } },
    "source_refs": { "type": "array", "items": {
      "type": "object",
      "properties": { "id":{"type":"string"}, "manual":{"type":"string"}, "chapter":{"type":["string","null"]}, "page":{"type":["integer","null"]} },
      "required": ["id","manual"] } },
    "missing_info": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["repair_title","summary","warnings","tools","parts","steps","source_refs","missing_info"]
}
```
`image_refs` og `source_refs[].id` er `manual_figures.id` / `manual_chunks.id`, så
PDF-motoren kan slå opp riktig bilde og kilde.

---

## 8. PDF-generering

- **@react-pdf/renderer**: en fast React-mal (`<Document>`) som tar JSON-en og
  rendrer tittel → advarsler → verktøy → deler/væsker → steg (med figur-bilder
  hentet fra Storage) → momenttabell → kildeliste. AI-en produserer **aldri**
  layout — bare data.
- Hent figurbilder server-side (signert URL → buffer → `<Image>`).
- Lagre PDF til `repair-guides/<id>.pdf`, sett `repair_guides.pdf_path`.
- Knytt mot maskin: lagre som `repair_guides` + valgfritt opprett `work_orders`
  (type `corrective`/`scheduled`) eller `maintenance_logs`-oppføring som lenker
  til PDF-en. Bruker godkjenner/redigerer JSON før lagring (status `draft`→`approved`).

---

## 9. API-endepunkter

```
POST /api/manuals                 → opprett manual-rad + signert opplastings-URL
POST /api/manuals/:id/index       → enqueue Inngest-indeksering
GET  /api/manuals?equipmentId=    → manualer for maskin (+ status)
POST /api/manuals/ask             → { equipmentId, question } → svar + kilder
POST /api/manuals/repair-guide    → { equipmentId, task } → strukturert JSON
POST /api/repair-guides/:id/pdf   → render PDF, returner signert URL
POST /api/repair-guides/:id/save  → lagre mot maskin / lag arbeidsordre
GET  /api/manuals/figure/:id      → signert URL til figur
GET  /api/manuals/page/:manual/:n → signert URL til sidebilde
```
Alle ruter server-side (anon-nøkkel aldri eksponert), krever innlogging, og
filtrerer på maskinens manualer før søk.

---

## 10. Indekserings-jobb (Inngest, skisse)

```ts
inngest.createFunction({ id: 'index-manual' }, { event: 'manual/uploaded' },
  async ({ event, step }) => {
    const { manualId } = event.data;
    const pdf   = await step.run('download', () => downloadFromStorage(manualId));
    const parsed= await step.run('parse',    () => parsePdf(pdf));      // PyMuPDF/LlamaParse
    const chunks= await step.run('chunk',    () => chunkSections(parsed));
    await step.run('figures', () => storeFigures(manualId, parsed.figures));
    const vecs  = await step.run('embed',    () => voyageEmbed(chunks.map(c => c.content)));
    await step.run('upsert',  () => upsertChunks(manualId, chunks, vecs));
    await step.run('ready',   () => setStatus(manualId, 'ready'));
  });
```
- **PDF-parsing** er den tekniske flaskehalsen. To veier:
  - **Egen worker** (Railway/Fly/Render) med **PyMuPDF (fitz)**: tekst m/koordinater,
    tabeller, figur-utklipp, sidebilder. Mest kontroll, billigst i drift.
  - **Managed** (LlamaParse, Unstructured, Google Document AI): minst kode, betaler
    per side. Bra for MVP.
- Inngest gir retries og delvis gjenkjøring per steg — viktig når parsing feiler
  på enkeltsider.

---

## 11. App-integrasjon — konkret plassering i dagens app

Forankret i komponentene som finnes i dag. **Viktig utgangspunkt:** appen har
allerede opplasting av dokumenter per maskin (`components/equipment/DocumentSection.tsx`
→ `equipment_documents` + Storage), med en `Dokumenttype`-nedtrekk som til og med
har «Bruksanvisning» og «Vognkort». Opplastingsmønsteret finnes altså allerede —
vi henger en automatisk prosess på det og legger til et sted å spørre.

### 11.0 Synlighetsregel — ingen manual, ingen «spør»
**«Spør manualen» (og alle avledede knapper) vises kun når maskinen har minst én
manual med status `ready`.** Dette er både UX og sikkerhet: assistenten finnes
bare når det finnes kildemateriale å svare fra — den skal aldri kunne svare uten
kilde.

Konkret oppførsel per tilstand:
- **Ingen manual:** «Spør»-feltet og hurtigvalgene vises ikke. For **admin** vises
  kun et lite hint/opplasting: «Last opp en verkstedmanual for å aktivere
  assistenten». For **medlem** vises ingenting (de kan ikke laste opp likevel).
- **Manual indekseres:** «Spør» er deaktivert med status «Klargjør manualen…».
- **Minst én `ready`:** «Spør manualen» + hurtigvalg blir aktive.

Samme regel gjelder de avledede inngangspunktene: knappene «Hva sier manualen?» /
«Lag reparasjonsguide» i `ReportFaultModal`, `WorkOrderDetailModal` og
vedlikeholds-modalene vises **kun** hvis maskinen har en `ready`-manual. Da finner
en bruker aldri en spør-funksjon på en maskin uten manual.

### 11.1 Opplasting → automatisk prosess (der dokumenter alt lastes opp)
- **Utløser:** i dokumentopplastingen, når en bruker laster opp en **PDF** og velger
  type **«Verkstedmanual» / «Servicemanual»** (vi utvider `documentType`-lista med
  disse). Da:
  1. opprettes en `manuals`-rad knyttet til maskinen,
  2. legges indekseringsjobben i kø (parse → chunk → vektoriser → lagre),
  3. vises status **rett i lista**: `Indekserer… → Klar for søk → Feilet`
     (merkelapp + «prøv igjen»).
- **Plassering:** behold sertifikat/vognkort/tegning i dagens `DocumentSection`,
  men gi **manualer en egen seksjon «Manualer & assistent»** rett under, fordi
  status *og* «Spør manualen» hører hjemme der. En manual som alt ligger som
  dokument kan «forfremmes» til søkbar manual uten ny opplasting.

### 11.2 Hvor det spørres (rangert, med faktiske steder)
1. **Maskinens detaljside (`EquipmentDetailClient`)** — hovedinngangen. Ny seksjon
   «Manualer & assistent» med **«Spør manualen»-felt** + hurtigknapper («Finn
   servicepunkt», «Finn feilkode», «Lag reparasjonsguide», «Vis manualbilder»).
2. **Feil-flyten (`ReportFaultModal`)** — har alt AI-diagnose fra bilde. Legg til
   «Hva sier manualen?» / «Hva betyr feilkoden?» og «Lag reparasjonsguide» rett
   fra feilen → kobles til den korrigerende arbeidsordren.
3. **Arbeidsordren (`WorkOrderDetailModal`)** — «Lag reparasjonsguide» genererer
   guiden, og PDF-en lagres som **vedlegg** (`work_order_attachments`) → havner i
   maskinens historikk.
4. **Logg/planlegg vedlikehold (`LogMaintenanceModal` / `ScheduleMaintenanceModal`)**
   — «Hva skal gjøres på 500-timers service?» henter sjekklista fra manualen og
   kan **forhåndsutfylle sjekkpunktene** på arbeidsordren.

### 11.3 Svar og lagring
- Svar vises med **kildekort** (manual, kapittel, side, «vis siden»-miniatyr fra
  `manual_pages`).
- Reparasjonsguide = redigerbart utkast → «Godkjenn og lagre» → `repair_guides`,
  som kan forfremmes til **arbeidsordre** (PDF som vedlegg) eller **vedlikeholdslogg**.

### 11.4 Roller (gjenbruker migration 020)
- **Medlem:** «Spør manualen» + lese svar/kilder.
- **Admin:** laster opp/indekserer manualer, lagrer guider/arbeidsordrer.

### 11.5 Skjermflyt (maskinens detaljside)
```
EquipmentDetailClient
├─ … (bilde, status, handlingsrad: Reserver / Logg vedlikehold / Se ordrer)
├─ VehicleInfo
├─ WorkOrderSection      ← «Lag reparasjonsguide» på en ordre (Fase 2)
├─ CompatiblePartsSection
├─ InventorySection
├─ DocumentSection       ← PDF + type «Verkstedmanual» starter indeksering
└─ ▼ NY: «Manualer & assistent»
     ├─ Manualer:  [Porsche verkstedmanual ·  ✓ Klar ]
     │             [Service 996         ·  ⏳ Indekserer 62 % ]
     ├─ [ Spør manualen…________________________ ]  (Enter)
     │   hurtigvalg: Servicepunkt · Feilkode · Reparasjonsguide · Bilder
     └─ Svar:
         «Hydraulikkfilteret byttes slik: …»
         📎 Kilder:  Verkstedmanual · kap. 7 · s. 124   [vis siden]
         [ Lag reparasjonsguide ]  [ Lag arbeidsordre ]
```

**Spør → svar (sekvens):**
```
Bruker skriver spørsmål i seksjonen
  → POST /api/manuals/ask { equipmentId, question }
     → embed spørsmål (Voyage)
     → match_manual_chunks(equipmentId, …)   (hybrid, kun denne maskinens manualer)
     → ingen treff over terskel?  → «Ikke funnet i kildematerialet» (stopp)
     → Claude (Citations) på topp-K chunks
  → svar + kildekort vises inline
  → ev. «Lag reparasjonsguide» → /api/manuals/repair-guide → redigerbart utkast → PDF
```

---

## 12. Sikkerhetsregler (RLS)

- `manuals`, `manual_chunks`, `manual_figures`, `manual_pages`, `repair_guides`:
  SELECT for innlogget; INSERT/UPDATE/DELETE kun admin (samme mønster som
  migration 020 / `is_admin()`).
- Chunks/embeddings leses aldri direkte av klienten — kun via API (service-role)
  som først filtrerer på maskin. Klienten ser svar + kilder, ikke råindeksen.
- Storage privat; alt via signerte URL-er.
- **White-label/multi-tenant:** legg `org_id` på `manuals` (+ arv via maskinen) og
  filtrer i `match_manual_chunks`, så én gårds manualer aldri lekker til en annen.

---

## 13. Juridisk / opphavsrett (ikke juridisk rådgivning)

- Verkstedmanualer er **opphavsrettsbeskyttet**. Å lagre, indeksere og lage
  avledede guider er reproduksjon/bearbeiding.
- **Lavest risiko:** appen behandler **brukeropplastede** dokumenter — brukeren
  bekrefter i vilkårene at de har rett til å bruke manualen. Du er databehandler,
  ikke distributør. Ikke bygg et felles OEM-manualbibliotek du videreformidler.
- **Streng isolasjon:** en gårds manualer og guider er kun tilgjengelig for den
  gården (RLS/org_id). Generert PDF deles ikke ut bredt.
- Internt bruk for eier som *har* manualen er klart lavere risiko enn
  videresalg/distribusjon. Skal du selge dette kommersielt med OEM-innhold, må du
  trolig ha avtaler — **få en jurist til å se på vilkår og OEM-lisenser før
  kommersiell skala.**

---

## 14. Realistisk MVP og byggrekkefølge

**MVP (Fase 1) — «Spør manualen» med kilder:**
1. Opplasting av PDF → Storage + `manuals`-rad.
2. Indeksering: parse (start med managed LlamaParse for å unngå worker-jobb) →
   chunk → Voyage-embeddings → pgvector.
3. Hybrid søk + Claude med Citations → svar med manualnavn/kapittel/side.
4. UI: «Spør manualen» i maskinvisningen, kildekort.
   → Dette leverer kjerneverdien og lar deg måle retrieval-kvalitet før du bygger
   tyngre ting. Ingen PDF-generering ennå.

**Fase 2 — Reparasjonsguide + PDF:**
5. Figur-/sidebilde-uttrekk i indekseringen.
6. Strukturert reparasjons-JSON (tool-use) + redigerbart utkast i UI.
7. @react-pdf/renderer → PDF, lagre mot maskin + arbeidsordre.

**Fase 3 — Presisjon og bredde:**
8. Feilkode-oppslag og serviceintervaller som strukturerte oppslag (egne tabeller
   for koder/intervaller fra manualene → eksaktmatch).
9. Egen PyMuPDF-worker (erstatt managed parser for kostnad/kontroll).
10. Bilde-embeddings (CLIP) for «vis relevante manualbilder» visuelt.
11. Caching av spørsmål, evaluering/feedback-loop på svarkvalitet.

**Bygg først:** opplasting + indeksering + grounded Q&A med kilder.
**Kan vente:** PDF-generering, feilkode-/intervall-strukturering, egen worker,
bilde-embeddings, multi-tenant org_id (til white-label faktisk er aktuelt).

---

## 15. Kostnad og risiko (kort)

- **Embeddings:** engangskost per manual (få øre per side). Billig.
- **Generering:** per spørsmål/guide (Claude Sonnet, noen kr per guide). Lavt volum.
- **Parsing:** managed ~per side; egen worker = fast liten serverkost.
- **Største risiko:** parse-kvalitet på figurtunge manualer og presisjon på
  momentverdier/delenummer. Derfor: eksaktmatch via FTS/`pg_trgm`, Citations, og
  «utelat hvis ikke sitert»-regelen. Mål kvalitet i Fase 1 før du bygger PDF-laget.
```
```

---

### Konklusjon
Bygg det som **lag oppå dagens stack**: pgvector i Supabase, Voyage-embeddings,
Claude med Citations + tool-use (du har allerede mønsteret), Inngest for
indeksering, @react-pdf/renderer for PDF. Start med en stram MVP — opplasting,
indeksering og kildeforankret «Spør manualen» — og utvid til reparasjonsguider og
PDF når retrieval-kvaliteten er bekreftet.
