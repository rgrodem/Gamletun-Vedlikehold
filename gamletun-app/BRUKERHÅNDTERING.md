# Brukerhåndtering – Gamletun Vedlikehold

## Slik logger man inn

Appen bruker **innlogging med e-post + passord**:

1. Gå til appen og skriv inn **e-post** og **passord**.
2. Trykk **Logg inn**. Du sendes rett til oversikten.

Innloggingen skjer direkte i appen (ingen e-postlenke), så det fungerer også
fint som «app» (PWA) på mobil. Innlogget bruker holdes innlogget til de logger ut.

## Opprette nye brukere

Brukere opprettes i Supabase (kun inviterte brukere – ingen selvregistrering i appen):

1. **Supabase Dashboard → Authentication → Users**
2. **Add user → Create new user**
3. Fyll inn:
   - **Email:** brukerens adresse (f.eks. `ola@gamletun.no`)
   - **Password:** et passord (gi det til brukeren på en trygg måte)
   - **Auto Confirm User:** ✅ (viktig – ellers må e-posten bekreftes først)
4. Trykk **Create user**. Brukeren kan nå logge inn med e-post + passord.

Profil (navn) opprettes automatisk første gang brukeren logger inn. Du kan
sette/endre fullt navn senere i `profiles`-tabellen om ønskelig.

## Endre passord / sperre bruker

- **Endre passord:** Authentication → Users → velg bruker → «Reset password» / sett nytt passord.
- **Sperre midlertidig:** velg bruker → «Ban user».
- **Slette:** velg bruker → «Delete user».

## Logge ut

Trykk på brukermenyen øverst til høyre i appen → **Logg ut**.

## Feilsøking

- **«Feil e-post eller passord»** – sjekk at brukeren finnes i Authentication → Users,
  at passordet er riktig, og at **Auto Confirm User** var huket av da kontoen ble opprettet.
- **Kommer ikke inn etter opprettelse** – brukeren er sannsynligvis ikke bekreftet:
  åpne brukeren i Supabase og bruk «Confirm email».

## Kapasitet

Supabase Free dekker langt mer enn Gamletuns ~5–6 brukere. Ingen oppgradering nødvendig.
