# Aufzugvertrag

Plattform, auf der Eigentümer und Verwaltungen ihre Aufzugsanlage erfassen, feste Wartungsangebote von Schweizer Liftfirmen vergleichen und einen Vertrag vermittelt bekommen.

## Name

Die Marke heisst **Elevaris**. Hauptdomain ist **elevaris.ch**, dazu kommt **liftvergleich.ch** (leitet später auf elevaris.ch weiter). Beide Domains sind noch zu reservieren. Name, Domain, Kontakt-E-Mail (info@liftvergleich.ch) und Adresse stehen an einer einzigen Stelle: `lib/config.ts`. Dort ändern, und die ganze Seite übernimmt es.

## Stand

- **Kundenseiten:** Startseite, Anlage erfassen, Paketvergleich (Basis, Standard, Komplett), „Angebot annehmen“ mit Kontaktformular. Die Anfrage wird gespeichert.
- **Liftfirmen-Portal** (`/partner`): registrieren, anmelden, Preismodell erfassen (Einzugsgebiet, Antriebe, Hersteller, drei Pakete, Zuschläge) mit Live-Vorschau, veröffentlichen, eingegangene Anfragen sehen.
- **Verwaltung** (`/admin`): Liftfirmen prüfen und freischalten oder sperren, alle Anfragen mit Vermittlungsgebühr (CHF 160 pro Anfrage).
- Preise erscheinen im Vergleich erst, wenn die Firma freigeschaltet ist **und** „veröffentlichen“ angehakt hat. Solange das bei keiner Firma der Fall ist, zeigt der Vergleich erfundene Beispielpreise (`lib/beispielmodelle.ts`) mit Hinweis.
- **Beratung vor Ort** (`/beratung`): Buchungsformular, die Buchungen erscheinen in der Verwaltung.
- **E-Mails** (über Resend): Benachrichtigung mit PDF bei jeder Buchung „Beratung vor Ort“ (mit den hochgeladenen Dokumenten) und bei jedem angenommenen Angebot; „Passwort vergessen“ für Liftfirmen (Link 1 Stunde) und in der Verwaltung ein Knopf, der einen Link erstellt (24 Stunden). Ohne `RESEND_API_KEY` bleibt der Versand aus, Buchungen werden trotzdem gespeichert.
- Noch nicht gebaut: Bestätigung per E-Mail an Kunden (erst mit eigener Domain bei Resend), Rechnungen, Hosting in der Schweiz, Datenschutzerklärung.

## Testversion (Vercel + Neon, kostenlos)

Zum Ausprobieren, bevor ein Schweizer Hoster gewählt ist. Nur mit Testdaten verwenden (Server in Frankfurt).

1. Auf vercel.com mit GitHub anmelden, das Repository importieren.
2. Beim Import zwei Umgebungsvariablen setzen: `ADMIN_EMAIL` und `ADMIN_PASSWORT` (mind. 10 Zeichen). Das Verwaltungskonto wird damit automatisch angelegt.
3. Im Projekt unter „Storage“ eine Neon-Datenbank anlegen und mit dem Projekt verbinden (setzt `DATABASE_URL`).
4. Neu bereitstellen („Redeploy“). Die Tabellen werden beim ersten Aufruf angelegt.
5. Für E-Mails: bei resend.com einen API-Schlüssel erstellen und in Vercel `RESEND_API_KEY` sowie `BENACHRICHTIGUNG_AN` (Empfänger der Benachrichtigungen) setzen, dann neu bereitstellen. Solange keine eigene Domain bei Resend verbunden ist, sendet Resend nur an die eigene Adresse des Resend-Kontos; „Passwort vergessen“-Mails an Liftfirmen kommen dann noch nicht an (dafür gibt es den Knopf in der Verwaltung).

`vercel.json` legt die Server nach Frankfurt (`fra1`), nahe an die Datenbank. Bis zum Start ist die Seite für Suchmaschinen gesperrt (`robots` in `app/layout.tsx`).

## Lokal starten

Voraussetzung: Node.js 22 und eine PostgreSQL-Datenbank.

```bash
npm install
cp .env.example .env.local        # DATABASE_URL eintragen
npm run admin:anlegen -- name@firma.ch "langes-passwort"   # Verwaltungskonto (oder ADMIN_EMAIL/ADMIN_PASSWORT setzen)
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
| `app/beratung/` | Beratung vor Ort buchen |
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
