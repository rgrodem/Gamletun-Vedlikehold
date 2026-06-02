# Brukerhåndtering – Gamletun Vedlikehold

## Slik logger man inn

Appen bruker **passordløs innlogging med magic link**:

1. Brukeren går til appen og skriver inn sin **@gamletun.no**-e-postadresse.
2. Hun trykker «Send innloggingslenke» og får en e-post med en lenke.
3. Hun åpner lenken **på samme enhet** og blir logget rett inn. Ingen passord.

Alle med en `@gamletun.no`-adresse får tilgang automatisk – du trenger ikke opprette
brukere manuelt. Profilen opprettes første gang de logger inn.

## Hvem får tilgang?

Tilgang styres av e-postdomenet, ikke en manuell liste:

- **Alle `@gamletun.no`-adresser** slipper inn.
- I tillegg kan enkeltadresser utenfor domenet (f.eks. eierens private Gmail) slippes
  inn via miljøvariabelen **`AUTH_ALLOW_EMAILS`** (komma-separert liste).

### Endre unntakslisten (AUTH_ALLOW_EMAILS)

1. Gå til **Vercel → prosjektet → Settings → Environment Variables**.
2. Legg til / rediger `AUTH_ALLOW_EMAILS`, f.eks. `rgrodem@gmail.com,annen@eksempel.no`.
3. Redeploy (eller vent på neste deploy) for at endringen skal tre i kraft.

## Engangsoppsett i Supabase (gjøres én gang)

For at magic link skal fungere må redirect-URL-ene være tillatt:

1. Gå til **Supabase Dashboard → Authentication → URL Configuration**.
2. **Site URL:** `https://gamletun-vedlikehold.vercel.app`
3. **Redirect URLs** (legg til begge):
   - `https://gamletun-vedlikehold.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for lokal utvikling)
4. E-post-provideren er på som standard. Vil du bruke egen avsender/SMTP senere,
   settes det opp under **Authentication → Emails**.

## Sperre eller fjerne en bruker

1. **Supabase → Authentication → Users**.
2. Velg brukeren → «Ban user» (midlertidig) eller slett brukeren (permanent).
   En slettet `@gamletun.no`-bruker kan logge inn igjen så lenge domenet gir tilgang;
   for å stenge noen helt ute må de fjernes fra domenet eller appens tilgangsregel endres.

## Feilsøking

- **«Denne e-posten har ikke tilgang»** – adressen er ikke `@gamletun.no` og står ikke i
  `AUTH_ALLOW_EMAILS`.
- **«Lenken var utløpt eller allerede brukt»** – magic-link-lenker er korttidsgyldige og
  kan kun brukes én gang. Be om en ny lenke.
- **Får ingen e-post** – sjekk søppelpost, og at redirect-URL-ene over er satt.

## Kapasitet

Supabase Free dekker langt mer enn Gamletuns ~5–6 brukere (titusenvis av månedlige
brukere). Ingen oppgradering nødvendig.
