# Forbedringer: Flyt og Forretningslogikk

**Analyse av:** Gamletun Vedlikehold
**Dato:** 2025-12-09

---

## Nåværende Status

### Hva fungerer i dag:
1. **Reservasjoner** sjekker mot andre reservasjoner (kollisjonssjekk)
2. **Arbeidsordre** oppdaterer automatisk utstyrsstatus til "maintenance" når de starter
3. **Status** vises korrekt i UI basert på nåværende tilstand

### Manglende koblinger (identifisert):

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Reservasjoner  │  X  │  Utstyrsstatus   │  X  │  Arbeidsordre   │
│                 │     │                  │     │                 │
│ - start_time    │     │ - active         │     │ - scheduled     │
│ - end_time      │     │ - maintenance    │     │ - in_progress   │
│ - user_id       │     │ - inactive       │     │ - waiting_parts │
│                 │     │ - in_use         │     │                 │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                    INGEN KRYSSVALIDERING!
```

---

## Forbedringsforslag

### Prioritet 1: Kritiske forretningsregler

#### 1.1 Advarsel ved statusendring til vedlikehold
**Problem:** Når utstyr settes til "maintenance" (manuelt eller via arbeidsordre), får ingen beskjed om eksisterende reservasjoner.

**Løsning:**
```typescript
// I EditEquipmentModal.tsx - før status lagres
async function checkFutureReservations(equipmentId: string): Promise<Reservation[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('equipment_reservations')
    .select('*, user_profile:user_id(full_name)')
    .eq('equipment_id', equipmentId)
    .eq('status', 'active')
    .gte('start_time', now);

  return data || [];
}
```

**UI:** Vis advarsel før lagring:
```
⚠️ Advarsel: Dette utstyret har 2 fremtidige reservasjoner:
- Ola Nordmann: 15. des 2025
- Kari Hansen: 20. des 2025

Vil du fortsette og sette utstyret i vedlikehold?
[Avbryt] [Fortsett likevel]
```

#### 1.2 Blokkér reservasjon av utstyr i vedlikehold
**Problem:** Man kan reservere utstyr som er under vedlikehold.

**Løsning:** Utvid `checkAvailability()` i `lib/reservations.ts`:
```typescript
export async function checkAvailability(...) {
  // Eksisterende kode...

  // NY: Sjekk om utstyr er i vedlikehold
  const { data: equipment } = await supabase
    .from('equipment')
    .select('status')
    .eq('id', equipmentId)
    .single();

  if (equipment?.status === 'maintenance') {
    return {
      available: false,
      reason: 'equipment_in_maintenance',
      message: 'Utstyret er under vedlikehold'
    };
  }

  // Eksisterende reservasjonssjekk...
}
```

#### 1.3 Advarsel ved oppstart av arbeidsordre
**Problem:** Arbeidsordre kan startes uten å sjekke aktive reservasjoner.

**Løsning:** I `updateWorkOrder()` når status endres til `in_progress`:
```typescript
if (updates.status === 'in_progress') {
  const activeReservation = await getActiveReservationForEquipment(equipmentId);
  if (activeReservation) {
    throw new Error(`Utstyret er reservert av ${activeReservation.user_profile?.full_name}`);
  }
}
```

---

### Prioritet 2: Forbedret brukeropplevelse

#### 2.1 Automatisk "in_use" status ved aktiv reservasjon
**Problem:** `in_use` status må settes manuelt.

**Løsning:** Oppdater status automatisk:
- Når reservasjon starter → status = "in_use"
- Når reservasjon avsluttes → status = "active" (hvis ingen arbeidsordre)

```typescript
// Trigger ved reservasjonsstart
async function handleReservationStart(reservationId: string) {
  const reservation = await getReservation(reservationId);
  await updateEquipmentStatus(reservation.equipment_id, 'in_use');
}
```

#### 2.2 Tidslinje-visning for utstyr
Vis en kalender/tidslinje som kombinerer:
- Reservasjoner (blå)
- Planlagte arbeidsordre (gul)
- Aktive arbeidsordre (rød)

```
Desember 2025
┌────┬────┬────┬────┬────┬────┬────┐
│ Ma │ Ti │ On │ To │ Fr │ Lø │ Sø │
├────┼────┼────┼────┼────┼────┼────┤
│ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │
│    │ 🔵 │ 🔵 │    │ 🟡 │    │    │
│    │Res │Res │    │Plan│    │    │
└────┴────┴────┴────┴────┴────┴────┘
```

#### 2.3 Varslingssystem
Implementer varslinger for:
- [ ] Reservasjon som kolliderer med planlagt vedlikehold
- [ ] Arbeidsordre som nærmer seg forfallsdato
- [ ] Utstyr i vedlikehold over X dager
- [ ] Reservasjon som snart starter (påminnelse)

---

### Prioritet 3: Avanserte funksjoner

#### 3.1 Konfliktløsning ved booking
Når konflikt oppdages, tilby alternativer:
1. Velg annet tilgjengelig utstyr i samme kategori
2. Velg alternativ dato
3. Sett på venteliste

#### 3.2 Vedlikeholdsvindu-planlegging
La brukere definere "vedlikeholdsvinduer" - perioder hvor utstyr ikke kan reserveres for planlagt vedlikehold.

#### 3.3 E-postvarsler
Send e-post ved:
- Reservasjon bekreftet
- Reservasjon avlyst pga. vedlikehold
- Påminnelse om kommende reservasjon
- Arbeidsordre tildelt deg

---

## Implementeringsrekkefølge

| # | Forbedring | Kompleksitet | Påvirkning |
|---|------------|--------------|------------|
| 1 | Advarsel ved manuell statusendring | Lav | Høy |
| 2 | Blokkér reservasjon av vedlikeholdsutstyr | Lav | Høy |
| 3 | Advarsel ved arbeidsordre-oppstart | Medium | Høy |
| 4 | Automatisk "in_use" status | Medium | Medium |
| 5 | Tidslinje-visning | Høy | Medium |
| 6 | Varslingssystem | Høy | Høy |

---

## Anbefalt startpunkt

**Start med #1 og #2** - disse gir umiddelbar verdi og er relativt enkle å implementere:

1. **Advarsel i EditEquipmentModal** (30-60 min)
   - Legg til sjekk for fremtidige reservasjoner
   - Vis advarsel-modal før lagring

2. **Blokkér reservasjon** (15-30 min)
   - Utvid checkAvailability() med statussjekk
   - Oppdater UI med bedre feilmelding

Vil du at jeg starter med å implementere disse?

---

*Generert av BMAD Analyse*
