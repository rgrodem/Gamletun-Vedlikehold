# 📁 Storage Setup Guide - Gamletun Vedlikehold

Denne guiden viser hvordan du setter opp fillagring i Supabase for å kunne laste opp bilder og dokumenter.

## 🎯 Oversikt

Systemet bruker tre storage buckets:

1. **equipment-images** - Bilder av utstyr (erstatter emoji-ikoner)
2. **equipment-documents** - Dokumenter knyttet til utstyr (sertifikater, manualer, vognkort, etc)
3. **maintenance-attachments** - Bilder og dokumenter på vedlikehold

---

## 📋 Steg 1: Kjør database-migrering

Først må vi legge til de nye tabellene i databasen:

1. **Åpne Supabase Dashboard**
   - Gå til https://supabase.com
   - Logg inn og velg ditt prosjekt

2. **Åpne SQL Editor**
   - Klikk på "SQL Editor" i venstre sidebar
   - Klikk "+ New query"

3. **Kopier og kjør migrasjonen**
   - Åpne filen `supabase/migrations/003_add_file_storage.sql`
   - Kopier **ALT** innholdet
   - Lim inn i SQL-editoren
   - Klikk **"Run"** (eller Cmd/Ctrl + Enter)
   - Vent til du ser "Success. No rows returned"

✅ **Ferdig!** Tabellene er nå opprettet.

---

## 📂 Steg 2: Opprett Storage Buckets

Nå må vi opprette de tre storage buckets:

### 1. Equipment Images Bucket

1. **Gå til Storage**
   - Klikk på "Storage" i venstre sidebar i Supabase Dashboard

2. **Opprett ny bucket**
   - Klikk på **"New bucket"** (grønn knapp)
   - Fyll inn:
     - **Name:** `equipment-images`
     - **Public bucket:** ✅ **HUK AV** (bilder må være offentlige for å vises)
     - **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/heic`
     - **Max file size:** `15 MB` (støtter iPhone-bilder)
   - Klikk **"Create bucket"**

### 2. Equipment Documents Bucket

1. **Opprett ny bucket**
   - Klikk **"New bucket"** igjen
   - Fyll inn:
     - **Name:** `equipment-documents`
     - **Public bucket:** ❌ **Ikke huk av**
     - **Allowed MIME types:** `application/pdf, image/jpeg, image/png, image/webp, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - **Max file size:** `10 MB`
   - Klikk **"Create bucket"**

### 3. Maintenance Attachments Bucket

1. **Opprett ny bucket**
   - Klikk **"New bucket"** igjen
   - Fyll inn:
     - **Name:** `maintenance-attachments`
     - **Public bucket:** ✅ **HUK AV** (bilder/dokumenter må være offentlige for å vises)
     - **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/heic, application/pdf`
     - **Max file size:** `10 MB`
   - Klikk **"Create bucket"**

✅ **Ferdig!** Du skal nå se tre buckets i storage-oversikten.

---

## 🔐 Steg 3: Sett opp Storage Policies

Nå må vi tillate brukere å laste opp og laste ned filer:

1. **Åpne SQL Editor igjen**
   - Klikk på "SQL Editor"
   - Klikk "+ New query"

2. **Kopier og kjør policy-scriptet**
   - Åpne filen `supabase/storage-setup.sql`
   - Kopier **ALT** innholdet
   - Lim inn i SQL-editoren
   - Klikk **"Run"**
   - Du skal se suksess-melding

✅ **Ferdig!** Policies er nå satt opp.

---

## ✅ Steg 4: Verifiser oppsettet

Sjekk at alt er på plass:

### Database-tabeller

1. Gå til "Table Editor" i Supabase
2. Du skal nå se disse nye tabellene:
   - ✅ `equipment_documents`
   - ✅ `maintenance_attachments`
3. Sjekk at `equipment` tabellen har en ny kolonne: `image_url`

### Storage Buckets

1. Gå til "Storage" i Supabase
2. Du skal se disse tre buckets:
   - ✅ `equipment-images`
   - ✅ `equipment-documents`
   - ✅ `maintenance-attachments`

### Storage Policies

1. Gå til "Storage" → klikk på en bucket
2. Klikk på "Policies" tab øverst
3. Du skal se 4 policies for hver bucket:
   - ✅ Upload (INSERT)
   - ✅ View (SELECT)
   - ✅ Update (UPDATE)
   - ✅ Delete (DELETE)

---

## 🎨 Hva kan du nå gjøre i appen?

### På Equipment (Utstyr):

1. **Erstatt emoji med faktisk bilde**
   - Klikk på et utstyr
   - Last opp et bilde av maskinen
   - Bildet erstatter emoji-ikonet på kortet

2. **Last opp dokumenter**
   - Sertifikater (f.eks. EU-kontroll, godkjenninger)
   - Bruksanvisning
   - Vognkort
   - Deleregninger/tegninger
   - Annen dokumentasjon

### På Maintenance (Vedlikehold):

1. **Last opp bilder**
   - Ta bilde av arbeidet som ble gjort
   - Dokumenter tilstand før/etter

2. **Last opp dokumenter**
   - Skann vedlikeholdsskjema
   - Last opp rapporter
   - Annen dokumentasjon

---

## 📊 File size limits

Som standard er dette satt opp:

- **Equipment Images:** Maks 15 MB per bilde (støtter iPhone-bilder)
- **Equipment Documents:** Maks 10 MB per dokument
- **Maintenance Attachments:** Maks 10 MB per fil

Du kan endre disse i bucket-innstillingene hvis du trenger større filer.

---

## 🔧 Feilsøking

### "Failed to upload file"
- ✅ Sjekk at buckets er opprettet med riktig navn
- ✅ Sjekk at storage policies er kjørt
- ✅ Sjekk at brukeren er logget inn

### "Bucket not found"
- ✅ Sjekk at bucket-navnene er skrevet nøyaktig som vist over
- ✅ Bucket-navn er case-sensitive (små bokstaver)

### "File too large"
- ✅ Sjekk max file size i bucket-innstillingene
- ✅ Komprimer bilder før opplasting

### Filer vises ikke
- ✅ Sjekk at SELECT policy er aktivert på bucketen
- ✅ Hard refresh i nettleseren (Ctrl/Cmd + Shift + R)

### Bilder viser rødt kryss (X)
Dette betyr at bucketen er privat, men må være offentlig:
1. Gå til Storage i Supabase Dashboard
2. Finn `equipment-images` bucketen
3. Klikk på de tre prikkene (⋮) ved siden av bucket-navnet
4. Velg "Edit bucket"
5. **Slå PÅ "Public bucket"** (toggle til på)
6. Klikk "Save"
7. Refresh appen - bildene skal nå vises!

---

## 💡 Tips

### For best ytelse:
- Komprimer bilder før opplasting
- Bruk moderne format (WebP, HEIC)
- Unngå veldig store filer (>10 MB)

### For sikkerhet:
- Ikke last opp sensitive/personlige dokumenter uten kryptering
- Vurder å aktivere RLS (Row Level Security) i produksjon

---

## 📞 Support

Hvis du opplever problemer:
1. Sjekk browser console for feilmeldinger (F12 → Console)
2. Sjekk Supabase logs (Dashboard → Logs)
3. Kontakt utvikler for hjelp

---

✅ **Setup fullført!** Du kan nå laste opp bilder og dokumenter i appen.
