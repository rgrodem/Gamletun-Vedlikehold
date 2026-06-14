# Kjøretøyoppslag (Statens Vegvesen)

I «Rediger utstyr» → «Kjøretøy / tilhenger» kan du skrive inn et
registreringsnummer og trykke **Hent** for å fylle inn totalvekt, egenvekt og
dekkdimensjon automatisk fra Statens Vegvesen. Modellnavn fylles inn hvis
feltet er tomt.

## Oppsett i Vercel (Project → Settings → Environment Variables)

| Variabel | Verdi |
|---|---|
| `SVV_API_KEY` | API-nøkkelen fra Statens Vegvesen | 

Redeploy etter at variabelen er lagt inn.

> **Sikkerhet:** Nøkkelen brukes kun server-side (i `/api/vehicle-lookup`) og
> eksponeres aldri i nettleseren. Legg den aldri i koden eller i git. Hadde
> nøkkelen vært delt i en usikker kanal, bør den rulleres (lag ny) hos
> Statens Vegvesen.

## Teknisk

- Endepunkt: `https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata?kjennemerke=<regnr>`
  (kan overstyres med `SVV_API_URL`).
- Autentisering: header `SVV-Authorization: Apikey <nøkkel>`.
- Grense: 50 000 oppslag per nøkkel per døgn. Ruten krever innlogget bruker
  for å hindre misbruk av kvoten.
- Returnerer ikke eieropplysninger.
- Felter som hentes: `tillattTotalvekt`, `egenvekt`, dekkdimensjon (første
  aksel), merke og handelsbetegnelse.

## EU-kontroll

Responsen inneholder også frist for EU-kontroll
(`periodiskKjoretoyKontroll.kontrollfrist`). Dette er foreløpig ikke tatt i
bruk. Det kan enkelt kobles på som en frist/påminnelse senere ved å lagre
fristen og la den følge samme varslingsløype som annet vedlikehold.
