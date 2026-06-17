# Varelager (reservedeler) — oppsett

## 1. Databasemigrasjon
Kjør `supabase/migrations/019_add_parts_inventory.sql` i Supabase SQL Editor.
Den oppretter `parts`, `stock_movements`, `part_equipment_compat`, en
beholdnings-trigger og view-et `parts_low_stock`. Ingen nye miljøvariabler.

## 2. Hva som er bygget (MVP)

- **Varelager-side** (`/parts`): søk, kategori-/lavt-lager-filter, «Ny del» og «Innkjøp».
- **To typer deler:** *forbruk* (olje, mengde i liter) og *utstyrsspesifikk* (filtre knyttet til ett/flere utstyr via kompatibilitet).
- **Lager-hovedbok:** hver bevegelse (innkjøp/forbruk/korreksjon/retur) logges; beholdning beregnes via trigger.
- **Registrer innkjøp:** manuelt eller **les kvittering med KI** (bilde/PDF) → foreslår delelinjer, kategori, type og hvilket utstyr delen passer til; du velger hvilke linjer som skal inn. Finner eksisterende del eller oppretter ny.
- **Delside** (`/parts/[id]`): beholdning, «Passer til»-utstyr, historikk, og handlinger Innkjøp / Forbruk (kan knyttes til utstyr) / Tell opp (inventur).
- **QR-etikett:** skriv ut etikett med QR + navn, delenummer, hylle og hvilket utstyr delen passer til.
- **På utstyrssiden:** «Deler på lager» viser kompatible deler med beholdning — så du ser om du allerede har filteret før du bestiller.
- **Lavt-lager-varsel:** deler under min.beholdning tas med i den daglige påminnelses-e-posten.
- **Navigasjon:** «Varelager» i sidemenyen (desktop) og i pluss-hurtigmenyen (mobil).

## 3. Forhold til eksisterende
- `work_order_parts` (deleliste på ordre) og `inventory_items` (stillas-utlån) er **uendret**. Tettere kobling (trekke deler automatisk ved fullført arbeidsordre) er en naturlig neste utvidelse.

## 4. Verdt å vite
- KI-kvitteringslesing bruker eksisterende `ANTHROPIC_API_KEY` — ingen ny nøkkel.
- Strekkode-**skanning** (EAN med kamera) er ikke med i denne MVP-en; EAN kan registreres manuelt på delen nå, og kamera-skanning er en planlagt utvidelse (krever et eget bibliotek pga. manglende iOS-støtte i nettleserens innebygde API).
