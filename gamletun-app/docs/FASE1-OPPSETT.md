# Fase 1 — oppsett (KI, vær, push)

Denne PR-en legger til fem funksjoner. Her er alt du må gjøre for å ta dem i bruk.

## 1. Databasemigrasjon (Supabase SQL Editor)

Kjør `supabase/migrations/018_add_push_subscriptions.sql` (tabell for push-abonnementer). De andre funksjonene trenger ingen DB-endring.

## 2. Miljøvariabler i Vercel (Settings → Environment Variables)

| Variabel | Verdi | For |
|---|---|---|
| `ANTHROPIC_API_KEY` | Nøkkel fra console.anthropic.com | Dokument-parsing, feildiagnose, triagering |
| `FARM_LAT` / `FARM_LON` | Gårdens koordinater (maks 4 desimaler) | Værvarsel (default = Sandnes hvis tomt) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Fra `npx web-push generate-vapid-keys` | Push-varsler |
| `VAPID_SUBJECT` | `mailto:post@gamletun.no` | Push-varsler |

Redeploy etter at variablene er lagt inn. **Alt feiler "mykt"** — uten nøkler er funksjonene bare utilgjengelige, resten av appen er upåvirket.

## 3. Hva som er bygget

1. **Dokument-intelligens** — «Fyll inn fra kvittering/PDF» i Logg vedlikehold: last opp PDF/bilde → felter forhåndsutfylles (type, beskrivelse, dato, timer). Bruker godkjenner før lagring.
2. **Feildiagnose fra bilde** — i Meld feil: legg ved foto → «Analyser bilde med KI» foreslår tittel, prioritet, årsak og deler.
3. **Auto-triagering** — i Meld feil: «Foreslå prioritet» setter prioritet + kategori ut fra tittel/beskrivelse.
4. **Værvarsel (MET/yr.no)** — værstripe på Arbeidsordrer-siden for planlegging. Gratis, ingen nøkkel.
5. **Push-varsler** — «Slå på»-kort på Arbeidsordrer-siden. Push sendes når feil meldes (i tillegg til e-post).

## 4. Verdt å vite (for vurdering)

- **KI-svar er forslag**, tydelig merket «kontroller før lagring». Ingenting lagres automatisk.
- **Kostnad:** KI-kallene er små (~$0.01–0.40 per dokument/bilde). MET og push er gratis.
- **iPhone-push:** krever at appen er lagt til på Hjem-skjerm (PWA), iOS 16.4+. Kortet forklarer dette hvis det feiler.
- **Service worker** registreres kun i produksjon, så push kan ikke testes i `next dev` — test på Vercel-deploy.
- **maxDuration=60s** på KI-rutene; sjekk at Vercel-planen tillater det (Hobby kan ha lavere tak).
- **Bildeformat:** Claude tar imot JPEG/PNG/WebP/GIF. iOS HEIC kan bli avvist — de fleste opplastinger konverteres til JPEG av nettleseren.
