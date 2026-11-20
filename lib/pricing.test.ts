import { test } from "node:test";
import assert from "node:assert/strict";
import { vergleiche, preisProAufzug, deckt, chf, type Anlage, type Preismodell } from "./pricing.ts";

const modell = (firma: string, grund: number, extra: Partial<Preismodell> = {}): Preismodell => ({
  firma,
  plzPraefixe: ["8"],
  hersteller: "alle",
  antriebe: ["seil", "hydraulik"],
  pakete: [
    { stufe: "basis", grundpreisChf: grund, wartungenProJahr: 2, reaktionszeitStd: 24 },
    { stufe: "standard", grundpreisChf: grund + 500, wartungenProJahr: 3, reaktionszeitStd: 4 },
  ],
  zuschlaege: {
    proHaltestelleUeber4Chf: 100,
    hydraulikChf: 200,
    alterUeber25JahreChf: 300,
    brandfallsteuerungChf: 50,
    proKabinenabschlusstuerChf: 40,
  },
  optionen: { fernueberwachung: 250, verfuegbarkeit: null, ausserhalb: 300 },
  bewertung: 4,
  ...extra,
});

const anlage: Anlage = {
  gebaeudetyp: "Mehrfamilienhaus",
  plz: "8000",
  anzahlAufzuege: 1,
  aufzugsart: "Personenaufzug",
  antrieb: "seil",
  hersteller: "Schindler",
  haltestellen: 4,
  brandfallsteuerung: "nein",
};

test("Zuschläge werden zum Grundpreis addiert", () => {
  const m = modell("A", 1000);
  const a: Anlage = {
    ...anlage,
    haltestellen: 6,
    antrieb: "hydraulik",
    baujahr: 1990,
    brandfallsteuerung: "ja",
    kabinenabschlusstueren: 2,
  };
  // 1000 + 2*100 + 200 + 300 + 50 + 2*40
  assert.equal(preisProAufzug(m, m.pakete[0], a, []), 1830);
});

test("Nicht angebotene Option schliesst das Angebot aus", () => {
  const m = modell("A", 1000);
  assert.equal(preisProAufzug(m, m.pakete[0], anlage, ["verfuegbarkeit"]), null);
  assert.equal(preisProAufzug(m, m.pakete[0], anlage, ["fernueberwachung"]), 1250);
});

test("Firmen ausserhalb des Einzugsgebiets fallen weg", () => {
  assert.equal(deckt(modell("A", 1000), anlage), true);
  assert.equal(deckt(modell("B", 1000, { plzPraefixe: ["3"] }), anlage), false);
  assert.equal(deckt(modell("C", 1000, { hersteller: ["KONE"] }), anlage), false);
  assert.equal(deckt(modell("D", 1000, { antriebe: ["hydraulik"] }), anlage), false);
});

test("Preis gilt pro Aufzug mal Anzahl, günstigstes vergleichbares Angebot zuerst", () => {
  const r = vergleiche({ ...anlage, anzahlAufzuege: 2 }, [modell("Teuer", 2000), modell("Günstig", 1000)]);
  assert.equal(r.basis[0].firma, "Günstig");
  assert.equal(r.basis[0].preisProJahrChf, 2000);
  assert.equal(r.basis.length, 2);
  assert.equal(r.komplett.length, 0);
});

test("Bessere Servicewerte können einen höheren Preis aufwiegen", () => {
  const schnell = modell("Schnell", 1050, {
    pakete: [{ stufe: "basis", grundpreisChf: 1050, wartungenProJahr: 4, reaktionszeitStd: 2 }],
    bewertung: 5,
  });
  const r = vergleiche(anlage, [modell("Langsam", 1000), schnell]);
  assert.equal(r.basis[0].firma, "Schnell");
});

test("CHF-Format mit Schweizer Tausendertrennzeichen", () => {
  assert.match(chf(12500), /^CHF 12.500$/);
});
