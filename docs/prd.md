# Product Requirements Document (PRD)
# Gamletun Vedlikehold App

**Version:** 1.0
**Date:** 18. Oktober 2025
**Project Owner:** Gamletun
**Status:** Draft

---

## Executive Summary

Gamletun Vedlikehold App er en enkel, webbasert applikasjon for å registrere og spore vedlikehold og reparasjoner på gårdsutstyr. Appen skal gjøre det enkelt for 5 brukere å holde oversikt over service-historikk på maskiner som gravemaskiner, tilhengere, biler, traktorer og annet utstyr.

### Hovedmål
- Eliminere problemet med å glemme når vedlikehold ble utført
- Gi enkel tilgang på mobil og PC
- Lagre strukturert historikk per utstyr med bilder
- Generere rapporter over utført vedlikehold

---

## 1. Product Overview

### 1.1 Problem Statement
Gamletun har flere maskiner og utstyr som krever jevnlig vedlikehold (smøring, oljeskift, rust-inspeksjon, etc.). Teamet husker ikke alltid når vedlikehold ble utført, noe som fører til:
- Unødvendig dobbelarbeid
- Utsatt vedlikehold som kan føre til skader
- Mangel på dokumentasjon for forsikring/salg

### 1.2 Solution
En enkel webapplikasjon hvor brukere kan:
- Registrere utstyr med relevante vedlikeholdstyper
- Logge utført vedlikehold med dato, beskrivelse og bilder
- Se historikk per utstyr
- Generere og sende rapporter på e-post

### 1.3 Success Criteria
- Alle 5 brukere aktivt bruker appen innen 1 måned
- Minimum 80% av vedlikehold logges i appen
- Ingen kritiske bugs i produksjon
- App fungerer like godt på mobil som PC

---

## 2. Target Users

### Primary Users (5 personer)
- **Rolle:** Gårdsarbeidere og eiere på Gamletun
- **Teknisk nivå:** Varierende (må være intuitivt)
- **Bruksmønster:** Mobil i garasjen/verkstedet, PC for rapporter
- **Behov:** Rask logging etter utført arbeid

### Administrator
- **Rolle:** Eier/hovedansvarlig
- **Ansvar:** Invitere brukere, potensielt fjerne tilgang
- **Behov:** Kontroll over hvem som har tilgang

---

## 3. Functional Requirements

### 3.1 Brukeradministrasjon

#### FR-1.1: Brukerautentisering
- Kun inviterte brukere kan logge inn
- Admin sender e-post invitasjon
- Brukere logger inn med e-post og passord

#### FR-1.2: Roller
- **Admin:** Full tilgang + brukeradministrasjon
- **Bruker:** Full tilgang til utstyr og logging (opprett, rediger, slett)

**Acceptance Criteria:**
- [ ] Admin kan sende invitasjon via e-post
- [ ] Mottaker får e-post med registreringslink
- [ ] Nye brukere kan sette passord
- [ ] Innlogging kreves for all tilgang

---

### 3.2 Utstyrshåndtering

#### FR-2.1: Opprett utstyr
- Brukere kan opprette nytt utstyr
- **Felt:**
  - Navn (påkrevd)
  - Kategori (valgfri, f.eks. "Tilhenger", "Gravemaskin", "Bil")
  - Bilde (valgfri)
  - Relevante vedlikeholdstyper (velg fra liste eller legg til egne)

**Eksempel vedlikeholdstyper:**
- Oljeskift
- Smøring
- Rust-inspeksjon
- Dekktrykk
- Hydraulikkolje
- Filterskift
- Generell inspeksjon

#### FR-2.2: Rediger utstyr
- Brukere kan oppdatere navn, kategori, bilde
- Brukere kan legge til/fjerne vedlikeholdstyper

#### FR-2.3: Slett utstyr
- Brukere kan slette utstyr
- Bekreftelsesdialog: "Er du sikker? Alle vedlikeholdslogger vil også slettes."

#### FR-2.4: Hierarkisk visning
- Utstyr kan grupperes i kategorier
- Eksempel:
  ```
  📦 Tilhengere (3)
    └─ Tilhenger 1
    └─ Tilhenger 2
    └─ Tilhenger 3

  🚜 Gravemaskiner (1)
    └─ Volvo EC20

  🚗 Biler (2)
    └─ Pickup
    └─ Varebil
  ```

**Acceptance Criteria:**
- [ ] Brukere kan opprette utstyr med alle felt
- [ ] Brukere kan velge/lage egne vedlikeholdstyper
- [ ] Utstyr vises gruppert etter kategori
- [ ] Kategorier kan ekspanderes/kollapses
- [ ] Enkelt utstyr (som gravemaskin) vises direkte uten underkategorier

---

### 3.3 Vedlikeholdslogging

#### FR-3.1: Opprett vedlikeholdslogg
- Bruker velger utstyr
- **Felt:**
  - Type arbeid (velg fra utstyrets vedlikeholdstyper)
  - Beskrivelse (fritekst, valgfri)
  - Dato (default: i dag, kan endres)
  - Utført av (automatisk: innlogget bruker)
  - Bilder (opplasting av 1-5 bilder, valgfri)

#### FR-3.2: Se vedlikeholdshistorikk
- Hver utstyrsenhet har en kronologisk liste over vedlikehold
- Sortering: Nyeste først
- Visning:
  - Dato
  - Type arbeid
  - Utført av
  - Kort beskrivelse
  - Thumbnail av bilder (klikk for full størrelse)

#### FR-3.3: Rediger/slett logg
- Brukere kan redigere eller slette egne logger
- Bekreftelse før sletting

**Acceptance Criteria:**
- [ ] Brukere kan logge vedlikehold på alle utstyr
- [ ] Type arbeid vises kun hvis relevant for utstyret
- [ ] Bilder lastes opp og lagres sikkert
- [ ] Historikk vises tydelig på utstyrskort
- [ ] Enkelt å finne og åpne historikk per utstyr

---

### 3.4 Rapportering

#### FR-4.1: Generer rapport
- Bruker velger tidsperiode (f.eks. "Siste 30 dager", "Siste 3 måneder", eller egendefinert)
- Rapport viser:
  - Alt vedlikehold utført i perioden
  - Gruppert per utstyr eller kronologisk
  - Inkluderer: Dato, utstyr, type arbeid, utført av, beskrivelse

#### FR-4.2: Eksporter rapport
- Format: PDF eller Excel
- Kan lastes ned lokalt
- Kan sendes direkte på e-post

**Acceptance Criteria:**
- [ ] Brukere kan velge tidsperiode
- [ ] Rapport genereres dynamisk
- [ ] PDF/Excel inneholder all relevant informasjon
- [ ] E-post sendes med rapport som vedlegg
- [ ] E-post-sending bekreftes visuelt

---

### 3.5 Brukergrensesnitt

#### FR-5.1: Responsivt design
- App fungerer like godt på mobil og PC
- Navigasjon tilpasset skjermstørrelse
- Touch-vennlig på mobil

#### FR-5.2: Dashboard/Hjem
- Oversikt over alle utstyr (gruppert etter kategori)
- Knapp: "+ Nytt utstyr"
- Knapp: "📊 Generer rapport"

#### FR-5.3: Utstyrskort
- Klikk på utstyr → åpner detaljside
- Viser:
  - Bilde
  - Siste vedlikehold (dato + type)
  - Knapp: "+ Logg vedlikehold"
  - Liste med historikk

**Acceptance Criteria:**
- [ ] App er brukervennlig på iPhone og Android
- [ ] App er brukervennlig på PC (Chrome, Safari, Edge)
- [ ] All tekst er lesbar på små skjermer
- [ ] Knapper er store nok til touch-input

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-1:** Sidelastning < 2 sekunder på 4G-nettverk
- **NFR-2:** Bildeopplasting < 5 sekunder per bilde
- **NFR-3:** Rapport genereres < 3 sekunder

### 4.2 Security
- **NFR-4:** Kun autentiserte brukere har tilgang
- **NFR-5:** Passord lagres kryptert (bcrypt eller tilsvarende)
- **NFR-6:** HTTPS for all kommunikasjon
- **NFR-7:** Bilder lagres sikkert med tilgangskontroll

### 4.3 Scalability
- **NFR-8:** Systemet skal støtte oppskalering til 20 brukere uten endringer
- **NFR-9:** Database skal håndtere 1000+ utstyr og 10,000+ logger

### 4.4 Usability
- **NFR-10:** Nye brukere skal kunne logge sitt første vedlikehold innen 5 minutter uten opplæring
- **NFR-11:** App skal være intuitiv (minimal bruk av manualer)

### 4.5 Reliability
- **NFR-12:** 99% uptime
- **NFR-13:** Automatisk backup av database daglig

### 4.6 Cost
- **NFR-14:** Hosting kostnad < 200 kr/måned
- **NFR-15:** Foretrukket gratis løsning for 5 brukere

---

## 5. Technical Stack (Anbefalt)

### Frontend
- **Framework:** Next.js 14+ (React)
- **Styling:** Tailwind CSS + Shadcn/ui
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod validation

### Backend
- **BaaS:** Supabase
  - PostgreSQL database
  - Authentication (e-post invitasjoner)
  - Storage (bilder)
  - Row Level Security (RLS)

### Hosting
- **Frontend:** Vercel (gratis tier)
- **Backend:** Supabase (gratis tier)

### E-post
- **Service:** Resend eller SendGrid (gratis tier)

### Rapporter
- **PDF:** jsPDF eller React-PDF
- **Excel:** ExcelJS

---

## 6. User Stories & Epics

### Epic 1: Brukeradministrasjon
**US-1.1:** Som admin vil jeg invitere nye brukere via e-post, slik at kun autoriserte personer får tilgang.
**US-1.2:** Som ny bruker vil jeg motta en invitasjon og kunne registrere meg enkelt.
**US-1.3:** Som bruker vil jeg logge inn sikkert med e-post og passord.

### Epic 2: Utstyrshåndtering
**US-2.1:** Som bruker vil jeg opprette nytt utstyr med navn, kategori og bilde.
**US-2.2:** Som bruker vil jeg definere relevante vedlikeholdstyper for hvert utstyr.
**US-2.3:** Som bruker vil jeg se utstyr gruppert i kategorier på dashboardet.
**US-2.4:** Som bruker vil jeg kunne redigere eller slette utstyr jeg har opprettet.

### Epic 3: Vedlikeholdslogging
**US-3.1:** Som bruker vil jeg raskt logge vedlikehold direkte fra mobilen etter utført arbeid.
**US-3.2:** Som bruker vil jeg laste opp bilder av arbeidet for dokumentasjon.
**US-3.3:** Som bruker vil jeg se komplett historikk for hvert utstyr.
**US-3.4:** Som bruker vil jeg kunne redigere eller slette logger jeg har opprettet.

### Epic 4: Rapportering
**US-4.1:** Som bruker vil jeg generere rapport over vedlikehold i en valgt periode.
**US-4.2:** Som bruker vil jeg laste ned rapporten som PDF eller Excel.
**US-4.3:** Som bruker vil jeg sende rapporten direkte på e-post til meg selv eller andre.

### Epic 5: UI/UX
**US-5.1:** Som bruker vil jeg at appen skal være like enkel å bruke på mobil som PC.
**US-5.2:** Som bruker vil jeg ha et moderne, oversiktlig design.
**US-5.3:** Som bruker vil jeg navigere intuitivt uten opplæring.

---

## 7. Out of Scope (v1.0)

Følgende funksjoner er **IKKE** inkludert i første versjon:

- ❌ Automatiske påminnelser om vedlikehold
- ❌ Integrasjon med kalender (Google Calendar, Outlook)
- ❌ Notifikasjoner (push notifications)
- ❌ Offline-modus
- ❌ QR-kode scanning av utstyr
- ❌ Kostnadsberegning / budsjett-tracking
- ❌ Timemåler / kilometerstand tracking
- ❌ Integrasjon med deleleverandører
- ❌ Multi-språk support (kun norsk i v1.0)

Disse kan vurderes i fremtidige versjoner.

---

## 8. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Brukere forstår ikke hvordan appen fungerer | Høy | Medium | Enkel onboarding, tooltips, tutorial-video |
| Bildeopplasting feiler på dårlig nettverk | Medium | Høy | Vis progress bar, retry-logikk, komprimering |
| Supabase gratis tier fylles opp | Medium | Lav | Monitorere bruk, planlegge oppgradering |
| E-post havner i spam | Høy | Medium | Bruk verifisert domene, test med flere e-postklienter |
| Data tap ved feil | Høy | Lav | Daglig backup, soft delete (slettede logger beholdes 30 dager) |

---

## 9. Timeline & Milestones

### Phase 1: Setup & Design (Uke 1)
- Prosjektoppsett (Next.js, Tailwind, Supabase)
- Database design
- UI mockups / wireframes

### Phase 2: Core Features (Uke 2-3)
- Brukerautentisering
- Utstyrshåndtering (CRUD)
- Vedlikeholdslogging (CRUD)

### Phase 3: Advanced Features (Uke 4)
- Bildeopplasting
- Rapportgenerering
- E-post sending

### Phase 4: Testing & Polish (Uke 5)
- Responsivt design testing (mobil/PC)
- Bug fixing
- Performance optimization

### Phase 5: Deployment (Uke 6)
- Production deployment
- User onboarding
- Link fra gamletun.no

**Estimert total tid: 6 uker**

---

## 10. Success Metrics

### Adoption Metrics
- 5/5 brukere registrert innen 1 uke
- 4/5 brukere aktive daglig innen 1 måned

### Usage Metrics
- Minimum 10 vedlikeholds-logger per uke
- Minimum 1 rapport generert per måned

### Quality Metrics
- < 5 bugs rapportert første måned
- Gjennomsnittlig responstid < 2 sekunder
- 0 kritiske sikkerhetsproblemer

### User Satisfaction
- User satisfaction score > 4/5 (feedback survey etter 1 måned)

---

## 11. Appendix

### 11.1 Glossary
- **Utstyr:** Maskiner, kjøretøy eller verktøy som krever vedlikehold
- **Vedlikeholdstype:** Spesifikk type service (f.eks. oljeskift, smøring)
- **Logg:** En registrering av utført vedlikehold
- **Rapport:** Sammendrag av vedlikehold over en tidsperiode

### 11.2 References
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Shadcn/ui: https://ui.shadcn.com/

### 11.3 Contact
- **Product Owner:** Rune Gamletun
- **Website:** www.gamletun.no

---

**Document Status:** ✅ Ready for Review
**Next Step:** Create Architecture Document
**Approval Required:** Product Owner sign-off

---

*Generated with BMAD-METHOD™ Analyst Agent*
