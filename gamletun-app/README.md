# Gamletun Vedlikehold

Et moderne vedlikeholdssystem for utstyr og maskiner, bygget for Gamletun.

## Oversikt

Gamletun Vedlikehold er en webapplikasjon som gjør det enkelt å:
- Registrere og administrere utstyr
- Logge vedlikeholdsaktiviteter
- Generere rapporter med PDF-eksport
- Holde oversikt over vedlikeholdshistorikk

## Teknologi Stack

- **Frontend:** Next.js 15.5.6 (App Router)
- **Styling:** Tailwind CSS v3
- **Database:** Supabase (PostgreSQL)
- **Autentisering:** Supabase Auth
- **Språk:** TypeScript
- **Ikoner:** React Icons
- **PDF-generering:** jsPDF & jspdf-autotable

## Funksjoner

### Utstyrsadministrasjon
- ✅ Registrer nytt utstyr med detaljer (navn, modell, serienummer, kjøpsdato, etc.)
- ✅ Rediger eksisterende utstyr
- ✅ Slett utstyr (med bekreftelse)
- ✅ Organiser utstyr i kategorier
- ✅ Sett status (Aktiv, Under vedlikehold, Inaktiv)

### Vedlikeholdslogging
- ✅ Logg vedlikeholdsarbeid med type, dato og beskrivelse
- ✅ Rediger og slett vedlikeholdslogger
- ✅ Se komplett vedlikeholdshistorikk per utstyr
- ✅ Automatisk kobling til innlogget bruker

### Rapportering
- ✅ Filtrer vedlikehold etter dato, utstyr og type
- ✅ Hurtigvalg for måneder (denne måned, forrige måned, etc.)
- ✅ Eksporter til PDF med komplett oversikt
- ✅ Eksporter til CSV per utstyr
- ✅ Statistikk for siste 30 dager

### Sikkerhet
- ✅ Kun inviterte brukere kan logge inn
- ✅ Row Level Security (RLS) i database
- ✅ Middleware-beskyttelse av alle sider
- ✅ Autentisert bruker spores på alt vedlikehold

## Kom i gang

### Forutsetninger

- Node.js 18+ installert
- npm eller yarn
- Supabase-konto (gratis tier fungerer fint)

### Installasjon

1. **Klon repositoryet:**
```bash
git clone https://github.com/rgrodem/Gamletun-Vedlikehold.git
cd gamletun-app
```

2. **Installer avhengigheter:**
```bash
npm install
```

3. **Sett opp miljøvariabler:**

Opprett en `.env.local` fil i rot-mappen:
```env
NEXT_PUBLIC_SUPABASE_URL=din-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-supabase-anon-key
```

Du finner disse verdiene i Supabase Dashboard under Project Settings → API.

4. **Sett opp databasen:**

Kjør SQL-scriptene i `supabase/` mappen i følgende rekkefølge:

a. **Opprett tabeller** (kjør `schema.sql` eller opprett manuelt):
```sql
-- Se supabase/schema.sql for komplett skjema
```

b. **Legg til manglende kolonner:**
```bash
# Kjør innholdet fra: supabase/add-notes-column.sql
```

c. **Opprett profiles-tabell:**
```bash
# Kjør innholdet fra: supabase/create-profiles-table.sql
```

d. **Fiks performed_by constraint:**
```bash
# Kjør innholdet fra: supabase/FIKSE-PERFORMED-BY.sql
```

5. **Start utviklingsserver:**
```bash
npm run dev
```

Applikasjonen kjører nå på [http://localhost:3000](http://localhost:3000)

## Opprett første bruker

1. Gå til Supabase Dashboard
2. Naviger til **Authentication** → **Users**
3. Klikk **Add user** → **Create user**
4. Fyll inn:
   - Email: din@epost.no
   - Password: (velg et sterkt passord)
   - **Auto Confirm User:** ✅ HUK AV DENNE!
5. Klikk **Create user**
6. Logg inn på appen med disse credentials

For mer detaljert informasjon, se [BRUKERHÅNDTERING.md](./BRUKERHÅNDTERING.md)

## Prosjektstruktur

```
gamletun-app/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions
│   │   └── auth.ts              # Autentisering actions
│   ├── equipment/[id]/          # Utstyr detaljside
│   ├── login/                   # Innloggingsside
│   ├── reports/                 # Rapportside
│   ├── page.tsx                 # Hovedside/Dashboard
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Globale styles
├── components/                   # React komponenter
│   ├── auth/                    # Autentisering komponenter
│   │   ├── LoginForm.tsx
│   │   └── UserMenu.tsx
│   ├── equipment/               # Utstyr komponenter
│   │   ├── AddEquipmentModal.tsx
│   │   ├── EditEquipmentModal.tsx
│   │   ├── EquipmentDashboard.tsx
│   │   └── EquipmentDetailClient.tsx
│   ├── maintenance/             # Vedlikehold komponenter
│   │   ├── LogMaintenanceModal.tsx
│   │   ├── EditMaintenanceModal.tsx
│   │   └── MaintenanceHistory.tsx
│   └── reports/                 # Rapport komponenter
│       └── ReportClient.tsx
├── lib/                         # Utility libraries
│   └── supabase/               # Supabase klienter
│       ├── client.ts           # Client-side
│       └── server.ts           # Server-side
├── supabase/                    # SQL scripts
│   ├── schema.sql
│   ├── add-notes-column.sql
│   ├── create-profiles-table.sql
│   ├── enable-rls.sql
│   └── FIKSE-PERFORMED-BY.sql
├── middleware.ts                # Next.js middleware (auth)
├── .env.local                   # Miljøvariabler (ikke commit!)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Database Schema

### Tabeller

**equipment** - Utstyr/maskiner
- `id` (UUID, PK)
- `name` (TEXT, required)
- `model` (TEXT)
- `serial_number` (TEXT)
- `purchase_date` (DATE)
- `status` (TEXT: 'active', 'maintenance', 'inactive')
- `category_id` (UUID, FK → categories)
- `notes` (TEXT)
- `created_at` (TIMESTAMP)

**maintenance_logs** - Vedlikeholdslogger
- `id` (UUID, PK)
- `equipment_id` (UUID, FK → equipment)
- `maintenance_type_id` (UUID, FK → maintenance_types)
- `description` (TEXT)
- `performed_date` (DATE)
- `performed_by` (UUID, FK → profiles, nullable)
- `created_at` (TIMESTAMP)

**maintenance_types** - Typer vedlikehold
- `id` (UUID, PK)
- `equipment_id` (UUID, FK → equipment)
- `type_name` (TEXT)
- `created_at` (TIMESTAMP)

**categories** - Kategorier
- `id` (UUID, PK)
- `name` (TEXT)
- `icon` (TEXT)
- `color` (TEXT)
- `created_at` (TIMESTAMP)

**profiles** - Brukerprofiler
- `id` (UUID, PK, FK → auth.users)
- `email` (TEXT)
- `full_name` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Utviklingsguide

### Kjøre i development mode
```bash
npm run dev
```

### Bygge for produksjon
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Deployment

### Vercel (Anbefalt)

1. Push koden til GitHub
2. Gå til [vercel.com](https://vercel.com)
3. Importer repository
4. Legg til environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

For mer informasjon, se [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

## Brukerhåndtering

### Legge til nye brukere

Se detaljert guide i [BRUKERHÅNDTERING.md](./BRUKERHÅNDTERING.md)

**Kort versjon:**
1. Supabase Dashboard → Authentication → Users
2. Add user → Create user
3. Fyll inn email og password
4. ✅ Auto Confirm User
5. Create user

### Slette brukere

1. Supabase Dashboard → Authentication → Users
2. Klikk på de tre prikkene ved brukeren
3. Delete user
4. Bekreft

## Sikkerhet

- **RLS (Row Level Security):** Aktivert på alle tabeller
- **Autentisering:** Supabase Auth med email/password
- **Middleware:** Beskytter alle sider, redirecter til /login hvis ikke autentisert
- **Foreign Keys:** Sikrer data-integritet
- **Kun inviterte brukere:** Ingen kan registrere seg selv

## Feilsøking

### "Could not find column" feil
- Kjør SQL-scriptene i `supabase/` mappen på nytt
- Sjekk at alle kolonner er opprettet i Supabase Dashboard

### Foreign key constraint feil
- Kjør `supabase/FIKSE-PERFORMED-BY.sql`
- Sjekk at `profiles` tabellen eksisterer

### Kan ikke logge inn
- Sjekk at brukeren har "Email Confirmed" i Supabase
- Verifiser at miljøvariablene er riktige
- Clear browser cache og prøv igjen

### Middleware redirect loop
- Sjekk at `/login` ikke er beskyttet av middleware
- Verifiser at Supabase URL og Keys er riktige

## Bidrag

Dette er et internt prosjekt for Gamletun. For endringer eller forbedringer:

1. Opprett en ny branch
2. Gjør dine endringer
3. Test grundig
4. Opprett pull request

## Lisens

Privat - Gamletun

## Kontakt

For spørsmål eller support, kontakt:
- GitHub: [@rgrodem](https://github.com/rgrodem)
- Prosjekt: [Gamletun-Vedlikehold](https://github.com/rgrodem/Gamletun-Vedlikehold)

## Anerkjennelser

Bygget med hjelp fra:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Icons](https://react-icons.github.io/react-icons/)
- [jsPDF](https://github.com/parallax/jsPDF)

---

**Versjon:** 1.0.0
**Sist oppdatert:** Oktober 2025
🤖 Bygget med [Claude Code](https://claude.com/claude-code)
