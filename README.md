# Aufzugvertrag

Plattform, auf der Eigentümer und Verwaltungen ihre Aufzugsanlage erfassen, feste Wartungsangebote von Schweizer Liftfirmen vergleichen und einen Vertrag vermittelt bekommen.

## Name

Die Marke heisst **Elevaris**. Hauptdomain ist **elevaris.ch**, dazu kommt **liftvergleich.ch** (leitet später auf elevaris.ch weiter). Beide Domains sind noch zu reservieren. Name, Domain, Kontakt-E-Mail (info@liftvergleich.ch) und Adresse stehen an einer einzigen Stelle: `lib/config.ts`. Dort ändern, und die ganze Seite übernimmt es.

## Stand

- **Kundenseiten:** Startseite, Anlage erfassen, Paketvergleich (Basis, Standard, Komplett), „Angebot annehmen“ mit Kontaktformular. Die Anfrage wird gespeichert.
- **Liftfirmen-Portal** (`/partner`): registrieren, anmelden, Preismodell erfassen (Einzugsgebiet, Antriebe, Hersteller, drei Pakete, Zuschläge) mit Live-Vorschau, veröffentlichen, eingegangene Anfragen sehen.
- **Verwaltung** (`/admin`): Liftfirmen prüfen und freischalten oder sperren, alle Anfragen mit Vermittlungsgebühr (CHF 160 pro Anfrage).
- Preise erscheinen im Vergleich erst, wenn die Firma freigeschaltet ist **und** „veröffentlichen“ angehakt hat. Solange das bei keiner Firma der Fall ist, zeigt der Vergleich erfundene Beispielpreise (`lib/beispielmodelle.ts`) mit Hinweis.
- Noch nicht gebaut: E-Mail-Versand (Bestätigung an Kunde und Firma, Passwort vergessen), Rechnungen, Beratung vor Ort buchen, Hosting in der Schweiz, Datenschutzerklärung.

## Lokal starten

Voraussetzung: Node.js 22 und eine PostgreSQL-Datenbank.

```bash
npm install
cp .env.example .env.local        # DATABASE_URL eintragen
npm run admin:anlegen -- name@firma.ch "langes-passwort"   # Verwaltungskonto
npm run dev                       # http://localhost:3000
npm test                          # Tests
npm run build                     # Produktions-Build
```

Die Tabellen werden beim ersten Zugriff automatisch angelegt. Ohne `DATABASE_URL` laufen nur die Kundenseiten mit Beispielpreisen; das Portal zeigt dann einen Hinweis.

`npm test` prüft die Vergleichslogik, Passwörter und das Preisformular. Die Datenbanktests laufen zusätzlich, wenn `TEST_DATABASE_URL` gesetzt ist (sie arbeiten in einem eigenen Schema und räumen danach auf).

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `lib/config.ts` | Marke „Elevaris“, Zusatz-Domain, Kontakt-E-Mail und Adresse |
| `app/impressum/page.tsx` | Impressum |
| `app/page.tsx` | Startseite |
| `app/anlage/page.tsx` | Formular „Anlage erfassen“ |
| `app/angebote/` | Paketvergleich und „Angebot annehmen“ (Preis wird auf dem Server neu berechnet) |
| `app/partner/` | Liftfirmen-Portal: Login, Registrierung, Übersicht, Preise |
| `app/admin/` | Verwaltung: Firmen freischalten, alle Anfragen |
| `lib/pricing.ts` | Vergleichslogik: Filter, Preisberechnung, Rangierung (60 % Preis, 25 % Service, 15 % Bewertung) |
| `lib/db.ts`, `lib/repo.ts` | Datenbankverbindung, Tabellen und Abfragen |
| `lib/passwort.ts`, `lib/sitzung.ts` | Passwörter (scrypt) und Anmelde-Cookie |
| `lib/preismodellForm.ts` | Prüft das Preisformular der Liftfirmen |
| `lib/anlageParams.ts` | Anlagedaten in der URL (kein Kundenkonto nötig) |
| `scripts/admin-anlegen.ts` | Legt ein Verwaltungskonto an |
