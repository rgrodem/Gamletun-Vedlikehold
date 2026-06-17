# Brukerroller, distribusjon og white-label

Dette dokumentet dekker tre ting: (1) den nye rolle-/tilgangsmodellen som nå er
bygget, (2) en grundig vurdering av distribusjon og betaling (App Store vs.
alternativer), og (3) hvordan en annen gård kan ta i bruk appen med egen
database og egen profil (white-label).

---

## 1. Brukerroller (bygget nå)

### To roller
- **Administrator** — full tilgang (som alle har i dag).
- **Medlem** (`user`) — kan **lese alt**, **melde feil** og **reservere utstyr**.
  Kan IKKE opprette, endre eller slette noe annet.

### Hvordan det håndheves
Tilgangen håndheves i **to lag**:
1. **Database (RLS)** — den ekte sikkerheten. Migrasjon `020` gjør at databasen
   nekter medlemmer å endre/slette uansett hvordan de prøver. Dette er ikke til
   å omgå fra appen.
2. **UI** — admin-knapper (rediger, slett, ny del, innkjøp, logg vedlikehold,
   planlegg, statusendring osv.) skjules for medlemmer, så de får et rent
   grensesnitt med bare det de skal kunne gjøre.

### Slik tar du det i bruk
1. **Kjør migrasjonen** `supabase/migrations/020_roles_and_permissions.sql` i
   Supabase SQL Editor. Den:
   - setter **alle eksisterende brukere til administrator** (så ingen mister
     tilgang),
   - setter `inge@gamletun.no` til **medlem**,
   - lager `is_admin()`, en sikker statusfunksjon, og skriver om RLS-reglene.
2. **inge logger inn** som normalt (magic link — `@gamletun.no` er allerede
   tillatt). Profilen opprettes automatisk som **medlem**.
3. Gå til **Brukere** i menyen (vises kun for admin) for å se alle brukere og
   skru admin/medlem av og på.

> Merk: Du kan ikke endre din egen rolle (sikring mot å låse deg selv ute).
> En bruker kan heller ikke heve sin egen rolle — en database-trigger blokkerer
> det.

### Hva medlemmer KAN gjøre
- Se all utstyr, arbeidsordrer, reservasjoner, varelager, rapporter.
- **Melde feil** (oppretter en korrigerende arbeidsordre, med foto).
- **Reservere utstyr** og styre **sine egne** reservasjoner.

### Hva medlemmer IKKE kan
- Opprette/endre/slette utstyr, deler, lager, kategorier, planlagt vedlikehold.
- Endre status på arbeidsordrer, fullføre, kommentere, slette.
- Logge vedlikehold, laste opp/slette dokumenter.

---

## 2. Distribusjon og betaling — grundig vurdering

### Utgangspunkt: appen er allerede en PWA
Appen er en **Progressive Web App**. Den kan installeres på hjemskjermen på
iPhone/Android i dag («Del → Legg til på Hjem-skjerm»), kjører i fullskjerm,
har eget ikon, fungerer offline-ish og får push-varsler. Du trenger i praksis
**ikke** App Store for at folk skal «laste den ned».

### Alternativ A — PWA + innlogging (anbefalt nå)
- **Installasjon:** del en lenke. Brukeren legger den til på hjemskjermen.
- **Tilgangskontroll:** allerede løst med magic-link og tillatt e-postdomene.
  Det er en *bedre* sperre enn pris — bare folk du slipper inn får tilgang.
- **Betaling:** håndteres utenfor appen (faktura, Vipps, eller Stripe-abonnement
  per gård). Ingen butikk tar 15–30 % kutt.
- **Kostnad:** ~0 utover Vercel/Supabase (gratis-/billige nivåer holder lenge).
- **Ulempe:** ikke synlig i App Store/Google Play (men det er sjelden et reelt
  behov for en lukket fagapp).

### Alternativ B — App Store / Google Play (native wrapper)
For å komme i butikkene må PWA-en pakkes som en app:
- **iOS:** Capacitor eller PWABuilder pakker nettappen i et tynt native-skall.
  Krever **Apple Developer Program (~$99/år)**. Apple kan avvise «rene
  nettsider» (retningslinje 4.2), men en app med ekte funksjonalitet (kamera,
  push, offline) går vanligvis gjennom.
- **Android:** TWA/PWABuilder. **Google Play (~$25 engangs)**. Enklere review.
- **Betaling i butikk:** Apple/Google tar **15–30 %** av betaling i app, og
  krever at du bruker deres betalingsløsning for digitale abonnement.
- **Vurdering:** Mye friksjon (kontoer, review, vedlikehold av builds, avgifter)
  for liten gevinst når målet ditt er *enkel installasjon* og *kontrollert
  tilgang* — begge løses bedre av Alternativ A.

### Om å «koste penger for å begrense nedlastinger»
Pris er en dårlig adgangssperre — den begrenser ikke *hvem*, bare *hvor mange*.
Det du egentlig vil ha er **kontrollert tilgang**, som du allerede har via
innlogging/allowlist. Hvis du vil ta betalt (for å dekke drift / som ekte
produkt), gjør det som et **abonnement per gård** (f.eks. Stripe), helt uavhengig
av om appen ligger i en butikk.

### Anbefaling
Bli på **PWA + innlogging** nå. Legg til **Stripe-abonnement per gård** når du
vil ta betalt. Vurder App Store/Play **kun** hvis du senere trenger butikk-
synlighet for markedsføring — da via Capacitor, som lett kan legges oppå dagens
kode uten omskriving.

---

## 3. White-label: en annen gård med egen database og egen profil

Du vil la en annen gård teste appen — **uten Gamletun-logo** og med **egen
database** som bygges opp fra bunnen. Det finnes to måter:

### Modell A — egen installasjon per gård (anbefalt)
Hver gård får sin **egen Supabase-database** og sin **egen Vercel-app**, fra
**samme kodebase**. Dette gir full dataisolasjon og enkel per-gård-profil.

**I praksis:**
1. **Ny Supabase-database** for den andre gården. Kjør alle migrasjonene
   (`schema.sql` + `001`–`020`). Tom database = bygges opp fra bunnen.
2. **Ny Vercel-app** koblet til samme GitHub-repo, men med egne miljøvariabler:
   - `NEXT_PUBLIC_SUPABASE_URL` / `…ANON_KEY` → den nye databasen
   - egne nøkler (Anthropic, e-post, push, SVV) om ønskelig
   - branding-variabler (se under)
3. **Egen URL**, f.eks. `gardsnavn.vedlikehold.no` eller en Vercel-subdomene.
4. Den andre gården logger inn og bygger opp sitt eget utstyr, lager osv.

**Fordeler:** total dataisolasjon (ingen risiko for å blande gårdenes data),
enkel branding, ingen endring i datamodellen.
**Ulempe:** du drifter N installasjoner — men fra ett repo, så en kodeendring
deployes til alle. For 2–3 gårder er dette helt udramatisk.

**Hva må gjøres kodemessig for å fjerne Gamletun-profilen?**
I dag er noen ting hardkodet. For å gjøre appen merkenøytral, gjør disse
styrt av miljøvariabler (en liten jobb jeg kan ta når du vil):
- Logo (`public/logo.png`) → per-gård logo, eller en `NEXT_PUBLIC_APP_LOGO`.
- Navn «Gamletun» i tittel, sidemeny-footer, manifest, e-postavsender.
- Tillatt e-postdomene i innlogging (`@gamletun.no`) → `AUTH_ALLOW_DOMAIN`.
- Temafarge/ikon i `manifest.json`.

### Modell B — én app for alle gårder (multi-tenant)
Én database der hver rad merkes med `org_id`, og RLS skiller gårdene. Dette er
riktig hvis du skal selge til *mange* gårder med selvbetjent registrering og
felles drift — men det er en **stor omskriving** (org_id på alle tabeller, ny
RLS, onboarding, fakturering per org). **Ikke verdt det for å teste med én gård.**

### Anbefaling
Start med **Modell A** for testgården: ny Supabase + ny Vercel + branding via
env. Det er raskt, trygt (separate data), og gir deg en ekte «white-label»-
instans uten å røre datamodellen. Hvis dette vokser til et reelt produkt med
mange kunder, revurderer vi Modell B da.

---

## Oppsummert anbefaling
- **Roller:** kjør migrasjon 020, la inge logge inn, styr roller under «Brukere».
- **Distribusjon:** bli på PWA + innlogging; ta ev. betalt med Stripe-abonnement;
  hopp over App Store inntil du trenger butikk-synlighet.
- **White-label:** egen Supabase + egen Vercel per gård (Modell A), og gjør
  branding env-styrt så Gamletun-profilen kan slås av per instans.
