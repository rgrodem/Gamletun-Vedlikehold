# Brukerhåndtering - Gamletun Vedlikehold

## Opprette nye brukere

Appen er satt opp med **kun inviterte brukere**. Det betyr at bare du kan opprette brukere, og ingen kan registrere seg selv.

### Steg-for-steg: Opprett en ny bruker

1. **Gå til Supabase Dashboard**
   - Åpne https://supabase.com
   - Logg inn på din konto
   - Velg ditt prosjekt (Gamletun Vedlikehold)

2. **Naviger til Authentication**
   - Klikk på "Authentication" i venstre sidebar
   - Klikk på "Users" tab

3. **Legg til ny bruker**
   - Klikk på "Add user" knappen (grønn knapp øverst til høyre)
   - Velg "Create user"

4. **Fyll inn brukerinfo**
   - **Email:** Brukerens e-postadresse (f.eks. `ola.nordmann@gamletun.no`)
   - **Password:** Et sterkt passord (minimum 6 tegn)
   - **Auto Confirm User:** ✅ Huk av denne (viktig!)
   - Klikk "Create user"

5. **Ferdig!**
   - Brukeren kan nå logge inn på appen med e-post og passord
   - Gi brukeren innloggingsinformasjonen sikkert (ikke via usikker e-post)

## Viktige sikkerhetstips

### Passord
- Bruk sterke passord (minst 12 tegn, blandede tegn)
- Ikke del passord via e-post eller SMS
- Be brukeren endre passord ved første innlogging (kan gjøres manuelt)

### E-post verifisering
- "Auto Confirm User" må være ✅ for at brukere skal kunne logge inn med en gang
- Hvis du ikke huker av denne, må brukeren bekrefte e-posten sin først

## Administrere eksisterende brukere

### Endre passord for en bruker
1. Gå til Authentication → Users i Supabase
2. Klikk på brukeren du vil endre
3. Scroll ned til "Update Password"
4. Skriv inn nytt passord
5. Klikk "Update user"

### Deaktivere en bruker (midlertidig)
1. Gå til Authentication → Users
2. Klikk på brukeren
3. Finn "Ban user" seksjonen
4. Sett duration (f.eks. 7 days eller permanent)
5. Klikk "Ban user"

### Slette en bruker (permanent)
1. Gå til Authentication → Users
2. Klikk på de tre prikkene ved siden av brukeren
3. Velg "Delete user"
4. Bekreft slettingen

## Aktivere Row Level Security (RLS)

RLS er nå forberedt, men fortsatt deaktivert for testing. Når du er klar til å aktivere den:

1. Gå til Supabase Dashboard
2. Klikk på "SQL Editor" i venstre sidebar
3. Klikk "+ New query"
4. Kopier innholdet fra filen `supabase/enable-rls.sql`
5. Lim inn i SQL-editoren
6. Klikk "Run" (eller trykk Cmd/Ctrl + Enter)

**Hva gjør RLS?**
- Sikrer at bare innloggede brukere kan se og endre data
- Hindrer uautorisert tilgang til databasen
- Gir deg full kontroll over hvem som har tilgang

## Feilsøking

### Bruker kan ikke logge inn
- ✅ Sjekk at "Auto Confirm User" var huket av når du opprettet brukeren
- ✅ Sjekk at passordet er riktig (minimum 6 tegn)
- ✅ Sjekk at brukeren ikke er banned

### "Invalid credentials" feilmelding
- Brukeren skrev feil e-post eller passord
- Be dem prøve igjen eller tilbakestill passordet

### Bruker fikk bekreftelses-e-post
- Dette skjer hvis "Auto Confirm User" ikke var huket av
- Du kan manuelt bekrefte brukeren:
  1. Gå til Authentication → Users
  2. Klikk på brukeren
  3. Under "Email", klikk "Confirm email"

## Hvor mange brukere kan jeg ha?

**Supabase Free tier:**
- Opptil 50,000 monthly active users (MAU)
- Ubegrenset totalt antall brukere
- Dette er MER enn nok for Gamletun! 🎉

## Fremtidig utvidelse

Hvis dere senere vil ha:
- Automatisk passord-reset via e-post
- Brukeradministrasjon direkte i appen
- Roller (Admin vs. vanlig bruker)
- Flere organisasjoner/kunder

... ta kontakt, så kan vi utvide systemet!
