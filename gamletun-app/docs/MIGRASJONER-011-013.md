# Nye migrasjoner: 011–013 (må kjøres FØR deploy)

De nye funksjonene (bilder på feilmeldinger, deleliste og driftstimer) krever
tre nye databasemigrasjoner. **Kjør dem i Supabase før denne koden deployes**,
ellers vil arbeidsordre-sidene feile fordi koden spør etter kolonner/tabeller
som ikke finnes ennå.

## Slik gjør du det

1. Åpne [Supabase Dashboard](https://supabase.com/dashboard) → prosjektet ditt
   → **SQL Editor**.
2. Kjør innholdet i disse filene, i rekkefølge:
   - `supabase/migrations/011_add_work_order_attachments.sql`
   - `supabase/migrations/012_add_work_order_parts.sql`
   - `supabase/migrations/013_add_usage_hours.sql`
3. Deploy/merge koden etterpå.

## Hva migrasjonene gjør

| Migrasjon | Innhold |
|---|---|
| 011 | Tabellen `work_order_attachments` — bilder på feilmeldinger/arbeidsordrer. Filene lagres i den eksisterende storage-bucketen `maintenance-attachments` (ingen ny bucket trengs). |
| 012 | Tabellen `work_order_parts` — deleliste per arbeidsordre (Trengs / Bestilt / Mottatt). |
| 013 | `equipment.usage_hours` (timeteller) og `work_orders.due_hours` (timebasert forfall). |

Ingen eksisterende data endres; alt er nye tabeller/kolonner.
