# Reservedels- / varelagermodul — løsningsskisse

*Utarbeidet juni 2026 etter en fokusert workflow (praktisk arbeidsflyt + datamodell/teknologi), kryssjekket mot kodebasen og state of the art for CMMS-lager, strekkode-skanning og etikettutskrift.*

---

## 1. Kjernen — hva modulen gjør

Lukker sløyfen **kjøp inn → på lager → forbruk på utstyr → historikk og kostnad**:

- Alt som kjøpes inn registreres (manuelt, eller ved at KI leser kvitteringen).
- Lageret skiller mellom **forbruksmateriell** (olje på liter) og **utstyrsspesifikke deler** (filtre knyttet til en bil/maskin) — så man ikke plukker feil filter.
- Ved vedlikehold/reparasjon velges deler fra lageret → trekkes fra beholdning → knyttes til ordren og utstyret. Det gir **kostnad per utstyr over tid** nesten gratis.
- QR-etiketter på hyllene så man fysisk finner riktig del raskt.

---

## 2. Det viktigste designvalget: lager som «hovedbok», ikke ett antall-felt

Begge spor lander på samme konklusjon: bruk en **lagerbevegelses-hovedbok** (ledger), ikke bare et antall på hver del.

- Et `antall`-felt sier bare «vi har 4 nå».
- En hovedbok sier «kjøpte 10 den 3. mars, brukte 2 på traktorservice den 5., korrigerte −1 ved inventur den 15.» — **med hvem, når og på hvilket utstyr.**

Beholdning beregnes (og caches via trigger), så lesing er rask mens historikken er intakt. Dette gir sporbarhet, revisjon og kostnad-per-utstyr som dagens enkle `inventory_items` (stillas) ikke kan.

---

## 3. Datamodell (Supabase/Postgres)

Nye tabeller (forenklet):

- **`parts`** — delekatalog: navn, `part_number`, `ean`, kategori, `part_type` (`consumable` | `equipment_specific`), `unit` (`stk`/`liter`/`meter`/`kg`), `location` (hylle), `min_stock`, `current_stock` (trigger-cachet), `unit_cost`, bilde, notat. Fulltekstsøk via `tsvector GENERATED ... STORED` + `pg_trgm` for fuzzy søk på delenummer/navn.
- **`stock_movements`** — append-only hovedbok: `movement_type` (`in`/`out`/`reserve`/`unreserve`/`correction`/`return`), `quantity`, `unit_cost`, og referanser til `work_order_id` / `maintenance_log_id` / `equipment_id` / `performed_by`. Trigger oppdaterer `parts.current_stock`.
- **`part_equipment_compat`** — mange-til-mange: ett filter passer flere maskiner, en maskin bruker mange deler.
- **`part_reservations`** — øremerking til utstyr/ordre uten fysisk uttak (myk reservering).

Tilgang: **flat modell** (alle innloggede kan administrere), likt resten av appen.

### Forhold til det som finnes
- **`work_order_parts`** (deleliste på ordre) utvides med en valgfri `part_id` → kobler fritekst-dele til katalogen. Når ordren fullføres, opprettes en `out`-bevegelse. Fritekst fortsetter å virke for ad-hoc.
- **`inventory_items`/`inventory_loans`** (stillas-utlån) **beholdes uendret** — annen semantikk (utlån, ikke forbruk). Kan evt. slås sammen senere, ikke nødvendig nå.

---

## 4. To-spors logikk (ditt kjerneønske)

| | Forbruksmateriell | Utstyrsspesifikk del |
|---|---|---|
| Eksempel | Motorolje 10W-40 | Oljefilter til MF 6455 |
| Knytning | Ingen — felles lager | `part_equipment_compat` til ett/flere utstyr |
| Enhet | liter (desimal) | stk |
| Ved forbruk | velg fra forbrukslager, skriv mengde | foreslås øverst når ordren gjelder riktig utstyr; **advarsel** (ikke blokkering) ved feil maskin |

Bestiller du «motorolje + to ulike oljefiltre» på én kvittering: olja går inn som forbruk på liter, hvert filter opprettes som utstyrsspesifikk del og knyttes til riktig maskin — KI foreslår, du bekrefter.

---

## 5. Arbeidsflyt

**Kjøpe inn:** Ta bilde av kvittering → KI foreslår linjer `[navn, antall, enhetspris, kategori, forbruk vs utstyr, foreslått utstyr]` → du huker av hvilke linjer som skal inn (kan ta **deler av** kvitteringen, f.eks. ikke servicepris) → `in`-bevegelser opprettes. Manuell registrering alltid mulig. App tilbyr «Print etikett?» for nye deler.

**Forbruk:** I arbeidsordren / vedlikeholdsloggen velger du deler (søk, skann QR, eller liste filtrert på utstyret) + mengde → ved lagring opprettes `out`-bevegelse → beholdning ned, koblet til ordre + utstyr.

**Inventur:** Tell opp, skriv inn faktisk antall → systemet lagrer differansen som `correction` med merknad «Inventur [dato]».

**Lavt lager:** `min_stock` per del → `parts_low_stock`-view → daglig varsel via **eksisterende** cron + e-post/push.

---

## 6. Etiketter, QR og strekkode

- **Egne hylle-etiketter:** bruk **QR** (navn, utstyr, delenummer, hylleplass, QR som lenker til delesiden). Gjenbruker QR- og utskrifts-CSS vi allerede har fra utstyrs-QR. Start med vanlig PDF/`@media print`; termisk etikett-printer (Brother QL/Zebra) er en valgfri fase 2.
- **Skanne produsentens strekkode (EAN):** fint for å finne/identifisere en del raskt. **Viktig funn:** nettleserens innebygde `BarcodeDetector` virker **ikke på iPhone Safari** (kun Android Chrome). Siden appen er mobil-først, må vi bruke et bibliotek (`html5-qrcode` eller `@zxing/browser`) som fallback. Dette er den **eneste nye tekniske avhengigheten** modulen trenger.
- EAN lagres på delen første gang (manuelt eller ved skann), for gjenkjenning senere. Det finnes ikke noe globalt EAN-register for reservedeler, så automatisk oppslag mot ekstern database er ikke realistisk i første fase.

---

## 7. Svar: holder Supabase? **Ja — med god margin.**

Varelager er et klassisk relasjonsproblem på én gårds skala (hundrevis til få tusen deletyper). Postgres dekker alt in-house:

| Behov | Postgres-løsning |
|---|---|
| Søk på navn/delenummer/EAN | `tsvector` (generated, stored) + `pg_trgm` — ingen ekstern søkemotor |
| Lager-hovedbok + rask beholdning | append-only `stock_movements` + trigger-cachet `current_stock` |
| Kostnad per utstyr over tid | aggregerende `view` — ingen time-series-DB |
| Lavt-lager-varsel | eksisterende Vercel-cron + view + Resend/push |
| KI-import | gjenbruk av `parse-document`-ruten med nytt skjema |

**Trenger ikke:** ingen Elasticsearch/Typesense, ingen TimescaleDB, ingen Redis-kø. Eneste nye npm-pakke er et strekkode-skannebibliotek (klient-side).

*(Eneste større forbehold gjelder ikke databasen, men retning: hvis appen senere skal bli fler-gårds SaaS, må også disse tabellene få `org_id` — samme valg som i 2.0-strategien.)*

---

## 8. Foreslått faseinndeling

**Fase A — MVP (~2–3 uker):**
- `parts` + `stock_movements` + trigger; delekatalog-UI (liste, søk, opprett del, to spor).
- Registrer innkjøp (manuelt + KI-kvittering med delvis import).
- Forbruk koblet til arbeidsordre/vedlikeholdslogg (trekk fra lager).
- `min_stock` + lavt-lager-varsel (gjenbruk cron).
- QR-etikett (PDF) + QR-skanning for å åpne del.

**Fase B — v1.1 (~1–2 uker):**
- `part_equipment_compat` (kompatibilitet, filtrert delevalg).
- Kostnad per utstyr (view + visning på utstyrssiden).
- EAN-skanning med `html5-qrcode`/zxing-fallback.
- Inventur-flyt med avviksrapport.
- Myk reservering (`part_reservations`).

**Fase C — kan vente:**
- Bestillingsforslag (handleliste fra alt under min.beholdning).
- Leverandørregister, termisk etikett-printer, forbruksgrafer.

---

## 9. Valg som er dine å ta

1. **Omfang av første versjon:** full MVP (Fase A) i én PR, eller starte med bare katalog + innkjøp + forbruk og legge til varsel/QR etterpå?
2. **Reservering:** trenger du øremerking nå, eller holder «velg fra lager ved forbruk» i starten? (Anbefaling: dropp hard reservering først — myk advarsel holder for enkeltpersondrift.)
3. **EAN-skanning:** ha den med i v1.1, eller vente? (QR på egne etiketter dekker det meste; EAN er bonus.)
4. **Etikett-printer:** vanlig skriver (PDF) nå, og evt. termisk printer senere?
