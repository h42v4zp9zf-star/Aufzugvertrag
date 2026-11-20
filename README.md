# Aufzugvertrag

Plattform, auf der Eigentümer und Verwaltungen ihre Aufzugsanlage erfassen, feste Wartungsangebote von Schweizer Liftfirmen vergleichen und einen Vertrag vermittelt bekommen.

## Stand

- Kundenseiten: Startseite, Anlage erfassen, Paketvergleich (Basis, Standard, Komplett).
- Preise kommen noch aus **erfundenen Beispieldaten** (`lib/beispielmodelle.ts`). Sobald das Liftfirmen-Portal steht, kommen sie aus der Datenbank.
- Noch nicht gebaut: Liftfirmen-Portal mit Login, Datenbank (PostgreSQL), E-Mail-Versand, Rechnungen, Beratung vor Ort buchen.

## Lokal starten

Voraussetzung: Node.js 22.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Tests der Vergleichslogik
npm run build    # Produktions-Build
```

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `app/page.tsx` | Startseite |
| `app/anlage/page.tsx` | Formular „Anlage erfassen“ |
| `app/angebote/` | Paketvergleich |
| `lib/pricing.ts` | Vergleichslogik: Filter, Preisberechnung, Rangierung (60 % Preis, 25 % Service, 15 % Bewertung) |
| `lib/anlageParams.ts` | Anlagedaten in der URL (kein Kundenkonto nötig) |
| `lib/beispielmodelle.ts` | Beispiel-Preismodelle erfundener Liftfirmen |

Platzhalter wie `[NAME]` und `[KONTAKT-E-MAIL]` werden ersetzt, sobald Name und Kontaktadresse feststehen.
