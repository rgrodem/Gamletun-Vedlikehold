# Gamletun Vedlikehold 2.0 — Strategirapport

*Utarbeidet juni 2026. Et innovasjonspanel med fire perspektiver — gårdseiere/maskinring, senior softwarearkitekt, investor/agritech og KI-/innovasjonsspesialist — har brainstormet og vurdert hva som tar appen til neste nivå. Funnene er krysset mot research på state of the art i 2026 (Claude API, MET/yr.no, Statens Vegvesen, offline-synk for Supabase).*

---

## 1. Metode

- **Fire parallelle «stemmer»** brainstormet uavhengig fra hvert sitt ståsted, deretter syntetisert til ett veikart.
- **Nettresearch (juni 2026)** for å verifisere at forslagene er realiserbare nå: Claude-modeller og priser, MET Locationforecast, Statens Vegvesen Autosys, og offline-synk-motorer (ElectricSQL/PGlite, PowerSync, Zero/Rocicorp).
- **Prioritering** etter verdi vs. innsats, med ærlige kostnadsoverslag (utvikling i dev-dager + løpende drift i NOK/API-kost).
- **Premiss:** kjernen består (utstyr, arbeidsordrer, reservasjon, vedlikeholdslogg, lager/utlån). Vi bygger *oppå*, river ikke.

---

## 2. Hvor står appen i dag

Solid 1.x-kjerne: utstyrsregister med QR, arbeidsordrer (feil m/ prioritet, planlagt, inspeksjon, sjekklister, deleliste), reservasjon, vedlikeholdslogg m/ timeteller og timebasert forfall, rapporter/PDF, dokument-/bildeopplasting, e-postvarsler (Resend), Statens Vegvesen-oppslag, og lager/utlån med antall.

**Det strategiske nøkkelfunnet:** appen er i dag **single-tenant med flat tilgang** — alle innloggede ser alt, og det finnes ingen `organisasjon_id`/`gård_id` i datamodellen. Det er helt riktig for én gård, men det er **det ene veivalget som avgjør om 2.0 kan bli et produkt for mange gårder**. Jo lenger vi venter med å bestemme dette, jo dyrere blir det å innføre senere.

---

## 3. Visjon for 2.0 — «Fra loggbok til intelligent driftsassistent»

> I dag *registrerer* appen hva som har skjedd. I 2.0 skal den **forstå, foreslå og forutse** — og fungere ute på jordet, uten dekning, med møkkete hender.

Tre bærende ambisjoner:
1. **KI i kjernen** — ta bilde av en feil og få diagnose + ferdig arbeidsordre; last opp en kvittering og få en ferdig vedlikeholdslogg; spør manualen i stedet for å bla i 200 sider.
2. **Bygd for felt** — offline-først, talestyrt logging, push-varsler, QR-trigget hjelp på stedet.
3. **Dokumentasjon og deling som verdi** — KSL/HMS/forsikring ut av permen, og utstyrsdeling mellom naboer/maskinring som en superkraft.

---

## 4. Idébank (alt panelet kom opp med, gruppert)

### A. Felt & hverdag
- **Offline-først med synk** — full funksjonalitet uten dekning, synkes når nettet er tilbake. *(Gårdseiers nr. 1 frustrasjon: apper som krever nett er ubrukelige der ting faktisk skjer.)*
- **Push-varsler** — akutt-feil sender push (ikke bare e-post) til valgte kontakter umiddelbart.
- **Talestyrt logging** — «logget oljeskift på traktoren, 2 timer» → ferdig utfylt logg.
- **QR-trigget feilhjelp** — skann maskinen → chat med kontekst om akkurat dette utstyret.

### B. KI & intelligens
- **Feildiagnose fra bilde** — foto → sannsynlig årsak, alvorlighetsgrad, foreslåtte deler, forhåndsutfylt arbeidsordre.
- **Dokument-intelligens** — kvittering/servicehefte/EU-kontroll-PDF → ferdig vedlikeholdslogg (vi har allerede gjort dette manuelt for Porsche-servicen).
- **RAG over manualer** — spør utstyrets egen manual, få svar med sidehenvisning.
- **Prediktivt vedlikehold** — risikoscore og 30-dagers plan fra timeteller + historikk + produsentintervaller.
- **Proaktiv vedlikeholds-agent** — nattlig jobb som leser data + vær + kalender og foreslår ukeplan.
- **Automatisk triagering** — klassifiser feilmeldinger (alvorlighet/kategori) automatisk.
- **Smart KI-rapport** — månedlig PDF med innsikt («hydraulikkfeil driver 23 % kostnadsøkning»).
- **Visuell slitasjesporing** — sammenlign bilder av samme komponent over tid.

### C. Dokumentasjon & compliance
- **KSL-sjekklistemodul** — digitale lister mot KSL-standardens krav, signatur, PDF-eksport.
- **Frist-/sertifikatkalender** — EU-kontroll, brannslukker, løfteutstyr, sprøytesertifikat — varsler 30/14/3 dager før.
- **Forsikrings-/skadedokumentasjon** — skademodus: bilder + hendelse + sted/tid → forsikringsklar PDF.
- **HMS-avvik + KI-genererte HMS-sjekklister** (også oversatt for utenlandsk arbeidskraft).
- **Geotag + tidsstempel på alle bilder** — uslettelig bevis for forsikring/KSL.
- **Opplærings-/generasjonsskiftelogg** — hvem fikk opplæring på hva, signert.

### D. Deling & økonomi
- **Maskinring-/nabodeling med bookingportal** — se tilgjengelighet og reserver på tvers av bruk. *(Gårdseiers nr. 1 verdidriver.)*
- **Leiekjøring + timeregistrering → faktura** (Fiken-kobling).
- **Drivstoff- og kostnadsoppfølging** — kr/time og kr/daa per maskin.
- **Delelager med minstebeholdning + bestillingsforslag**, koblet mot leverandør (Felleskjøpet o.l.).
- **Maskinkort/verdivurdering** — full historikk → bedre pris ved salg.

### E. Integrasjoner
- **MET/yr.no vær** — vær-tilpasset planlegging (gratis, ingen nøkkel).
- **Statens Vegvesen+** — KI tolker tekniske data → foreslår vedlikeholdsintervaller + EU-kontroll-frist inn i fristkalenderen.
- **Telematikk/CAN/ISOBUS/OBD** — automatiske timeteller-avlesninger fra moderne maskiner (lengre sikt).
- **Kart/GPS** — posisjon på utstyr (hvor står tilhengeren?).

### F. Plattform & forretning
- **Multi-tenant SaaS** — fra én gård til mange (org-modell + rollestyring).
- **Abonnement/freemium** — betalingsmodell.

---

## 5. Prioritert veikart

Rekkefølgen følger «høy verdi / lav innsats først», og bygger avhengigheter i riktig rekkefølge (f.eks. RAG før QR-chat).

### Fase 1 — KI-flaggskip & quick wins (4–8 uker)
*Maksimal wow og verdi for minimal innsats. Bygger på eksisterende data.*

| Funksjon | Verdi | Innsats | Metode |
|---|---|---|---|
| **Dokument-intelligens** (PDF → vedlikeholdslogg) | Høy | S–M | Claude PDF + structured output; «godkjenn før lagring»-steg |
| **Feildiagnose fra bilde** | Høy | S | Claude vision mot utstyrskontekst; «foreslått, ikke bekreftet» |
| **MET vær-varsling i planlegging** | Med–Høy | S | MET Locationforecast (gratis) + regelmotor |
| **Web-push-varsler** | Høy | S–M | PWA Web Push (VAPID) |
| **Automatisk triagering av feil** | Med | S | Claude Haiku few-shot → JSON |

### Fase 2 — Bygd for felt (6–10 uker)
| Funksjon | Verdi | Innsats | Metode |
|---|---|---|---|
| **Talestyrt logging** | Høy | M | Whisper + Claude Haiku intent-parsing |
| **RAG over manualer** | Høy | M | Supabase pgvector + embeddings + Haiku |
| **QR-trigget feilhjelp** (RAG + historikk) | Høy | M–L | Bygger på RAG; flaggskip felt-UI |
| **Prediktivt vedlikehold** | Høy | M | LLM-resonering over timeteller/historikk + intervaller |
| **Offline-først (lese + kø av skriv)** | Høy | L | Se arkitektur-notat under |

### Fase 3 — Dokumentasjon, compliance & deling (8–14 uker)
| Funksjon | Verdi | Innsats | Metode |
|---|---|---|---|
| **Frist-/sertifikatkalender** (inkl. EU-kontroll fra Vegvesen) | Høy | S–M | Datofelt + varslingsløype vi allerede har |
| **KSL-sjekklistemodul** | Høy | M | Maler + signatur + PDF |
| **Forsikrings-/skademodus** | Høy | S–M | Strukturert hendelse + geotag-bilder → PDF |
| **Maskinring-/nabodeling med booking** | Høy | L | Krever multi-tenant (Fase 4) for full verdi |
| **Leiekjøring → faktura (Fiken)** | Med | M | Fiken API |

### Fase 4 — Plattform & kommersialisering (parallelt / ved satsing)
| Funksjon | Verdi | Innsats | Metode |
|---|---|---|---|
| **Multi-tenant (org_id + RLS per org)** | Høy (forretning) | L | Se kritisk arkitektur-valg under |
| **Selvbetjent onboarding + abonnement** | Høy (forretning) | M–L | Stripe/Vipps + Supabase Auth |
| **Rollestyring** (eier/ansatt/leietaker) | Med | M | RLS-roller |

---

## 6. Kritiske arkitektur-valg (fra senior-arkitekt-stemmen)

Tre valg er «nå eller aldri» — de er dyre eller umulige å reversere senere:

1. **Multi-tenant: JA eller NEI — nå.** `organization_id` på alle tabeller er binært og irreversibelt uten en stor migrasjon. Enten legg det inn nå (koster ~3–5 dager mens databasen er liten), eller aksepter at appen forblir for én gård. Det finnes ingen halvveis-løsning, og migrasjonsvinduet lukkes etter hvert som data vokser. *Anbefaling: legg inn `org_id` tidlig med Gamletun som default-org, selv om resten av SaaS-en kommer senere.*
2. **Offline-strategi — påvirker ALL datafetching.** Realistiske veier mot Supabase i 2026:
   - **PowerSync** — mest moden for Supabase i 2026 (offisiell integrasjon, replikerer valgte tabeller til lokal SQLite via OPFS, toveis synk m/ konfliktdeteksjon). Self-host (gratis, FSL-lisens) eller sky fra **$49/mnd**. Skrivesti går utenom — du beholder backend-logikken.
   - **ElectricSQL + PGlite** — Postgres i nettleseren (WASM), HTTP-shapes; gratis å self-hoste; Supabase co-sponser PGlite. Krever direkte DB-tilkobling (ikke pooler) + IPv6.
   - **Zero (Rocicorp)** — rask, men **støtter ikke offline-skriv** → mindre egnet her.
   - *Anbefaling: enten ta PowerSync som et bevisst arkitekturskifte (2–3 uker), eller start enkelt med service worker-cache (lesing) + lokal skrive-kø. Ikke la det bli et udefinert «vi fikser det senere» — det smitter på hele datalaget.*
3. **Ikke bygg egen KI-orkestrering.** For én utvikler med KI-assistanse: Claude **tool use** med en enkel agentisk loop (5–10 linjer per agent) + Vercel Cron + **structured outputs** for all datauttrekk. Ingen LangChain, ingen egen agent-server. Kompleksiteten skal ligge i Supabase + Next.js, ikke i et agentlag. Bruk **Haiku 4.5** til klassifisering/parsing/oversettelse, **Sonnet 4.6 / Opus 4.8** til vision/diagnose, og **prompt caching** (90 % rabatt) + **Batch API** (50 % rabatt) på nattlige jobber.

*Et de-risket poeng:* **Web Push fungerer nå også på iPhone** (iOS 16.4+, krever PWA lagt til på hjemskjerm; EU-tilgangen ble gjenopprettet i 2024). Push er derfor en trygg, moden funksjon — bygg med VAPID/`web-push` selv, eller en EU-hostet tjeneste (Pushwoosh/WonderPush) for GDPR.

---

## 7. Kostnadsoverslag (grovt)

### Utvikling
Innsats er primært tid (KI-assistert solo-utvikling, slik vi har jobbet). Buckets: **S = 1–3 dager, M = 4–10 dager, L = 10+ dager.**
- **Fase 1:** ~3–6 uker samlet.
- **Fase 2:** ~6–10 uker.
- **Fase 3:** ~8–14 uker.
- **Fase 4 (multi-tenant + SaaS):** ~4–8 uker (kan deles opp).

### Løpende drift — én gård (Fase 1–2)
Bekreftede 2026-priser. Forbruket på én gård er lavt:

| Tjeneste | Kost |
|---|---|
| Claude API (vision + parsing + RAG) | ~$10–30/mnd ved normal bruk |
| Whisper (talelogging) | < $1/mnd |
| MET/yr.no vær | Gratis |
| Statens Vegvesen | Gratis (50 000 kall/døgn) |
| Resend (e-post) | Gratis-nivå holder |
| Supabase | Gratis → Pro $25/mnd |
| Vercel | Gratis → Pro $20/mnd |
| **Sum** | **≈ 300–700 kr/mnd** |

### Løpende drift — SaaS for mange gårder (Fase 4)
Legg til offline-synk-infra (ElectricSQL self-host på liten VPS, eller Zero Starter ~$30/mnd / PowerSync etter bruk), Supabase Pro/Team, og KI-kost som skalerer med antall gårder. COGS per gård forblir lav (titalls kroner i KI/infra) → god SaaS-margin.

---

## 8. Forretning & marked (investor-stemmen)

**Markedet (verifiserte tall, 2026):**
- **~36 700 aktive gårdsbruk i Norge** (ned fra 70 700 i 1999 — færre, men større; snitt 26,8 ha). Utbredte maskinringer/samdrifter, pluss anleggs-/utleieaktører med maskinpark.
- **White space:** Det finnes **ingen dedikert vedlikeholds-/utstyrs-SaaS bygget for det norske/nordiske landbruket**. Segmentet dekkes i dag av generiske internasjonale CMMS-verktøy (MaintainX, UpKeep) og brede farm-management-plattformer (John Deere Operations Center, Trimble). Norske aktører er innen *andre* nisjer: MIMIRO (datadeling), Farmable (hagebruk), PowerOffice Landbruk (regnskap), Forformidling (digital maskinring). Vedlikehold er åpent terreng.
- **Global referanse:** farm-management-software-markedet er ~USD 3,4–4,2 mrd. (2024), 11–17 % årlig vekst. Nordisk agritech-investering toppet på ~USD 191 mill. i 2024. (Ingen egen norsk TAM-tall finnes offentlig.)

**Konkurrentenes prising (referanse for egen modell):**
- MaintainX (CMMS): gratis → ~$16/bruker/mnd Pro → $197–597/mnd business.
- Trimble Ag: ~$300–4 700/år etter nivå. Farmbrite: $49–149/mnd.
- John Deere Operations Center: gratis basis. Norsk landbruksregnskap (Agro/Duett): ~5 000 kr/år.
- *Realistisk norsk SaaS-prising:* en enkel plan rundt **199–399 kr/mnd per gård** og en pro-plan **600–1 200 kr/mnd** (maskinring/entreprenør) virker plausibelt gitt referansene.

**Betalingsvilje (høyest først):** maskinring-deling, KSL/compliance-dokumentasjon, forsikrings-/skadedokumentasjon, prediktivt vedlikehold/KI.

**Moat:** (1) integrasjoner som er vanskelige å kopiere (Statens Vegvesen, MET, telematikk via Leaf/JDOC), (2) maskinhistorikk over tid = verdivurdering + lavere forsikringsrisiko, (3) nettverkseffekt ved deling mellom gårder/maskinringer.

**Partnerskap å utforske:** Felleskjøpet, landbruksforsikring (Gjensidige/Landbruksforsikring — rabatt mot dokumentert HMS/vedlikehold), maskinforhandlere, Tine/Nortura.

**Ærlig vurdering:** Appen kan fint forbli et utmerket internt verktøy — det er null skam i det. Men kombinasjonen **KSL + maskinring-deling + KI-dokumentasjon** treffer en reell, udekket smerte i et marked uten en spesialisert norsk aktør. *Hvis* man vil satse kommersielt, er multi-tenant-valget (punkt 6.1) inngangsbilletten, og en fokusert nisje (vedlikehold + deling for norske gårder/maskinringer) er en mer realistisk vei enn å konkurrere bredt mot John Deere/Trimble.

---

## 9. Anbefaling — hva nå

**Topp 3 å bygge først (høy verdi, lav risiko, bygger på det vi har):**
1. **Dokument-intelligens** (PDF → ferdig vedlikeholdslogg) — flaggskip-demoen. Lav innsats, umiddelbar wow, vi har allerede bevist verdien manuelt.
2. **Feildiagnose fra bilde** — bilder finnes allerede i systemet; Claude vision oppå er en liten, slående gevinst.
3. **Frist-/sertifikatkalender med EU-kontroll fra Vegvesen** — gjenbruker varslingsløypa vi nettopp bygde, og treffer en konkret compliance-smerte.

**Parallelt, ett strategisk grep:** beslutt multi-tenant-spørsmålet. Selv om SaaS ligger lenger frem, koster det lite å legge inn `org_id` nå og spare en smertefull migrasjon senere.

**Neste steg:** velg 1–2 funksjoner fra Fase 1, så lager jeg en konkret implementasjonsplan (datamodell, API, UI, kost) og bygger — på samme måte som resten av appen er bygget.
