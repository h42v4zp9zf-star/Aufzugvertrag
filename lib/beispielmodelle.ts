// BEISPIELDATEN: Erfundene Liftfirmen und Preise, nur zum Anschauen der Seiten.
// Sobald das Liftfirmen-Portal steht, kommen die echten Preismodelle aus der Datenbank.
import type { Preismodell } from "./pricing.ts";

export const BEISPIELMODELLE: Preismodell[] = [
  {
    firma: "Beispiel Lift AG",
    plzPraefixe: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    hersteller: "alle",
    antriebe: ["seil", "hydraulik"],
    pakete: [
      { stufe: "basis", grundpreisChf: 1450, reaktionszeitStd: 24, pikett: "keine" },
      { stufe: "standard", grundpreisChf: 2150, reaktionszeitStd: 4, pikett: "24h" },
      { stufe: "komplett", grundpreisChf: 3400, reaktionszeitStd: 2, pikett: "24h" },
    ],
    zuschlaege: {
      proHaltestelleUeber4Chf: 90,
      hydraulikChf: 150,
      alterUeber25JahreChf: 300,
      brandfallsteuerungChf: 120,
      proKabinenabschlusstuerChf: 80,
      sicherheitsdispositivChf: 180,
    },
    optionen: { fernueberwachung: 240, verfuegbarkeit: 600, ausserhalb: 350 },
    bewertung: 4.3,
  },
  {
    firma: "Muster Aufzüge GmbH",
    plzPraefixe: ["3", "4", "5", "6", "8"],
    hersteller: "alle",
    antriebe: ["seil", "hydraulik"],
    pakete: [
      { stufe: "basis", grundpreisChf: 1290, reaktionszeitStd: 24, pikett: "keine" },
      { stufe: "standard", grundpreisChf: 2290, reaktionszeitStd: 6, pikett: "tag" },
      { stufe: "komplett", grundpreisChf: 3250, reaktionszeitStd: 4, pikett: "24h" },
    ],
    zuschlaege: {
      proHaltestelleUeber4Chf: 70,
      hydraulikChf: 220,
      alterUeber25JahreChf: 450,
      brandfallsteuerungChf: 100,
      proKabinenabschlusstuerChf: 60,
      sicherheitsdispositivChf: 150,
    },
    optionen: { fernueberwachung: 200, verfuegbarkeit: null, ausserhalb: 300 },
    bewertung: 4.0,
  },
  {
    firma: "Demo Aufzugservice",
    plzPraefixe: ["7", "8", "9"],
    hersteller: ["Schindler", "KONE", "Otis", "Emch"],
    antriebe: ["seil"],
    pakete: [
      { stufe: "basis", grundpreisChf: 1550, reaktionszeitStd: 12, pikett: "tag" },
      { stufe: "standard", grundpreisChf: 2050, reaktionszeitStd: 3, pikett: "24h" },
      { stufe: "komplett", grundpreisChf: 3600, reaktionszeitStd: 2, pikett: "24h" },
    ],
    zuschlaege: {
      proHaltestelleUeber4Chf: 110,
      hydraulikChf: 0,
      alterUeber25JahreChf: 250,
      brandfallsteuerungChf: 90,
      proKabinenabschlusstuerChf: 70,
      sicherheitsdispositivChf: 220,
    },
    optionen: { fernueberwachung: 180, verfuegbarkeit: 550, ausserhalb: null },
    bewertung: 4.7,
  },
  {
    firma: "Alpen Lift Service (Beispiel)",
    plzPraefixe: ["1", "2", "3", "6", "7"],
    hersteller: "alle",
    antriebe: ["seil", "hydraulik"],
    pakete: [
      { stufe: "basis", grundpreisChf: 1380, reaktionszeitStd: 24, pikett: "keine" },
      { stufe: "standard", grundpreisChf: 2200, reaktionszeitStd: 5, pikett: "24h" },
    ],
    zuschlaege: {
      proHaltestelleUeber4Chf: 85,
      hydraulikChf: 180,
      alterUeber25JahreChf: 350,
      brandfallsteuerungChf: 110,
      proKabinenabschlusstuerChf: 75,
      sicherheitsdispositivChf: 200,
    },
    optionen: { fernueberwachung: 220, verfuegbarkeit: null, ausserhalb: 320 },
    bewertung: 4.1,
  },
];
