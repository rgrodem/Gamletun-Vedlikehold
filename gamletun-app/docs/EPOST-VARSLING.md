# E-postvarsling (Resend)

Appen sender tre typer e-post:

1. **Feilvarsel** — når noen melder feil på utstyr, varsles
   vedlikeholdsansvarlig (`NOTIFY_EMAIL`) og alle som har aktiv reservasjon
   på utstyret.
2. **Reservasjonsvarsel** — når noen reserverer utstyr, varsles
   `RESERVATION_NOTIFY_EMAIL` (faller tilbake til `NOTIFY_EMAIL`).
3. **Daglig påminnelse** (kl. 05:00 UTC ≈ 06–07 norsk tid) — oppsummering av
   forfalt vedlikehold og det som forfaller innen 7 dager, til `NOTIFY_EMAIL`.

Sending feiler aldri «høyt»: mangler en nøkkel, hopper appen bare over
varslingen og logger det — selve feilmeldingen/arbeidsordren opprettes uansett.

## Oppsett i Vercel (Project → Settings → Environment Variables)

| Variabel | Verdi | Påkrevd |
|---|---|---|
| `RESEND_API_KEY` | API-nøkkelen fra resend.com → API Keys | Ja |
| `NOTIFY_EMAIL` | E-posten til vedlikeholdsansvarlig (f.eks. din egen) | Ja |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` | Ja |
| `CRON_SECRET` | Tilfeldig streng (f.eks. `openssl rand -hex 32`) — beskytter cron-endepunktet. Vercel sender den automatisk. | Ja (for påminnelser) |
| `EMAIL_FROM` | Avsender, f.eks. `Gamletun <varsel@gamletun.no>` | Nei |
| `RESERVATION_NOTIFY_EMAIL` | Egen mottaker for reservasjonsvarsler, f.eks. `rune@gamletun.no` | Nei |

Husk å **redeploye** etter at variablene er lagt inn (Deployments → ⋯ → Redeploy).

## Standardmodus uten domene (slik det er satt opp nå)

Uten `EMAIL_FROM` brukes Resend sin testavsender `onboarding@resend.dev`.
Da gjelder én begrensning fra Resend: **e-post leveres kun til adressen
Resend-kontoen er registrert med.** I praksis betyr det at alle varsler går
til deg (sett `NOTIFY_EMAIL` til samme adresse). Forsøk på å varsle andre
brukere logges, men leveres ikke.

## Oppgradering til eget domene (senere, valgfritt)

1. Resend → Domains → Add Domain → `gamletun.no`.
2. Legg inn DNS-oppføringene Resend viser (SPF + DKIM) hos domeneleverandøren.
3. Når domenet viser «Verified»: sett `EMAIL_FROM=Gamletun <varsel@gamletun.no>`
   i Vercel og redeploy.

Da leveres varsler også til andre brukere (de som har reservert utstyret).

## Teknisk

- `lib/email.ts` — tynn klient mot Resend sitt REST-API (ingen ekstra npm-pakke).
- `app/api/notify/fault/route.ts` — kalles av appen når feil meldes.
- `app/api/cron/reminders/route.ts` — kjøres daglig av Vercel Cron (vercel.json).
- `lib/supabase/admin.ts` — service-rolle-klient, kun server-side.
