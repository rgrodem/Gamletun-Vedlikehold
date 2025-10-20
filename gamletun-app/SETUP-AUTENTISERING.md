# Setup Autentisering - Slik kommer du i gang

Autentiseringssystemet er nå ferdig! Her er hva du må gjøre for å komme i gang:

## Steg 1: Opprett din første bruker

1. **Gå til Supabase Dashboard**
   - Åpne https://supabase.com
   - Logg inn
   - Velg prosjektet ditt

2. **Opprett bruker**
   - Gå til "Authentication" → "Users" i venstre sidebar
   - Klikk "Add user" → "Create user"
   - Fyll inn:
     - **Email:** Din e-postadresse (f.eks. `din@epost.no`)
     - **Password:** Et sterkt passord (skriv det ned!)
     - **Auto Confirm User:** ✅ VIKTIG: Huk av denne!
   - Klikk "Create user"

## Steg 2: Test innlogging

1. Åpne appen i nettleseren: http://localhost:3000
2. Du blir automatisk sendt til innloggingssiden
3. Logg inn med e-posten og passordet du opprettet
4. Du skal nå se dashboard med ditt utstyr

## Steg 3: Aktiver Row Level Security (RLS)

**NÅ KAN DU VELGE:**

### Alternativ A: Hold RLS deaktivert (anbefalt for testing)
- RLS er fortsatt deaktivert for enklere testing
- Alle innloggede brukere får tilgang til alt
- Perfekt mens dere tester systemet

### Alternativ B: Aktiver RLS (anbefalt for produksjon)
1. Gå til Supabase Dashboard
2. Klikk "SQL Editor" i venstre sidebar
3. Klikk "+ New query"
4. Åpne filen `supabase/enable-rls.sql` i denne mappen
5. Kopier ALT innholdet
6. Lim inn i SQL-editoren
7. Klikk "Run" (eller Cmd/Ctrl + Enter)
8. Vent til den sier "Success"

**Hva gjør RLS?**
- Sikrer at bare innloggede brukere kan se data
- Hindrer uautorisert tilgang til databasen
- Gir deg bedre sikkerhet

## Hva er endret?

✅ **Innloggingsside** - Kun inviterte brukere kan logge inn
✅ **Beskyttede sider** - Må være logget inn for å se noe
✅ **Brukerinfo i navbar** - Se din e-post og logg ut-knapp
✅ **Automatisk performed_by** - Vedlikehold knyttes til innlogget bruker
✅ **RLS forberedt** - Klar til å aktiveres når du vil

## Teste funksjonaliteten

1. **Test innlogging**
   - Prøv å gå til http://localhost:3000
   - Du skal bli sendt til /login
   - Logg inn og bekreft at du kommer til dashboard

2. **Test logg ut**
   - Klikk på brukerikonet øverst til høyre
   - Velg "Logg ut"
   - Du skal bli sendt tilbake til innloggingssiden

3. **Test vedlikeholdslogging**
   - Logg inn igjen
   - Klikk "Logg Vedlikehold" på et utstyr
   - Fyll inn data og lagre
   - Vedlikeholdet skal nå være knyttet til din bruker!

4. **Test rapport**
   - Klikk "Generer Rapport" i navigasjonen
   - Sjekk at du ser all data
   - Test PDF-eksport

## Feilsøking

### "Invalid credentials"
- Sjekk at du skrev riktig e-post og passord
- Sjekk at "Auto Confirm User" var huket av

### Blir ikke sendt til innlogging
- Hard refresh (Ctrl/Cmd + Shift + R)
- Tøm nettleser-cache
- Sjekk at middleware.ts filen er lastet

### Får ikke logget vedlikehold
- Sjekk at du er logget inn
- Sjekk konsoll for feilmeldinger (F12 → Console)
- Hvis RLS er aktivert, sjekk at du kjørte enable-rls.sql riktig

## Legg til flere brukere

Les [BRUKERHÅNDTERING.md](./BRUKERHÅNDTERING.md) for fullstendig guide.

**Kort versjon:**
1. Gå til Supabase → Authentication → Users
2. Klikk "Add user"
3. Fyll inn e-post og passord
4. ✅ Huk av "Auto Confirm User"
5. Klikk "Create user"

## Viktig informasjon

- **Ingen kan registrere seg selv** - Du må opprette brukere manuelt
- **Passord minimum 6 tegn** - Bruk helst 12+ tegn
- **performed_by er ikke nullable lenger** - Alle vedlikehold knyttes til en bruker
- **RLS kan aktiveres når som helst** - Ingen nedetid

## Neste steg

Når autentiseringen fungerer som den skal:
1. Opprett brukere for alle som skal bruke systemet
2. Aktiver RLS for bedre sikkerhet (optional)
3. Test grundig med alle brukere
4. Deploy til Vercel/produksjon

---

**Spørsmål?** Se [BRUKERHÅNDTERING.md](./BRUKERHÅNDTERING.md) for mer informasjon!
