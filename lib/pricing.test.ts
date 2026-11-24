import { test } from "node:test";
import assert from "node:assert/strict";
import { vergleiche, preisProAufzug, deckt, chf, laufzeitText, type Anlage, type Preismodell } from "./pricing.ts";

const modell = (firma: string, grund: number, extra: Partial<Preismodell> = {}): Preismodell => ({
  firma,
  plzPraefixe: ["8"],
  hersteller: "alle",
  antriebe: ["seil", "hydraulik"],
  pakete: [
    { stufe: "basis", grundpreisChf: grund, reaktionszeitStd: 24, pikett: "keine" },
    { stufe: "standard", grundpreisChf: grund + 500, reaktionszeitStd: 4, pikett: "24h" },
  ],
  zuschlaege: {
    proHaltestelleUeber4Chf: 100,
    hydraulikChf: 200,
    alterUeber25JahreChf: 300,
    brandfallsteuerungChf: 50,
    proKabinenabschlusstuerChf: 40,
    sicherheitsdispositivChf: 70,
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

test("Sicherheitsdispositiv: Zuschlag nur bei „Ja“", () => {
  const m = modell("A", 1000);
  assert.equal(preisProAufzug(m, m.pakete[0], { ...anlage, sicherheitsdispositiv: "ja" }, []), 1070);
  assert.equal(preisProAufzug(m, m.pakete[0], { ...anlage, sicherheitsdispositiv: "nein" }, []), 1000);
  assert.equal(preisProAufzug(m, m.pakete[0], { ...anlage, sicherheitsdispositiv: "unbekannt" }, []), 1000);
  assert.equal(preisProAufzug(m, m.pakete[0], anlage, []), 1000, "ältere Anfragen ohne Angabe");
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
    pakete: [{ stufe: "basis", grundpreisChf: 1050, reaktionszeitStd: 2, pikett: "keine" }],
    bewertung: 5,
  });
  const r = vergleiche(anlage, [modell("Langsam", 1000), schnell]);
  assert.equal(r.basis[0].firma, "Schnell");
});

test("Wartungen pro Jahr sind pro Paket fix: Basis 2, Standard 4, Komplett 6", () => {
  const r = vergleiche(anlage, [
    modell("A", 1000, {
      pakete: [
        { stufe: "basis", grundpreisChf: 1000, reaktionszeitStd: 24, pikett: "keine" },
        { stufe: "standard", grundpreisChf: 1500, reaktionszeitStd: 4, pikett: "tag" },
        { stufe: "komplett", grundpreisChf: 2500, reaktionszeitStd: 2, pikett: "24h" },
      ],
    }),
  ]);
  assert.equal(r.basis[0].wartungenProJahr, 2);
  assert.equal(r.standard[0].wartungenProJahr, 4);
  assert.equal(r.komplett[0].wartungenProJahr, 6);
});

test("Pikett-Deckung erscheint im Angebot und zählt beim Service", () => {
  const paket = (pikett: "24h" | "tag" | "keine") => [{ stufe: "standard" as const, grundpreisChf: 2000, reaktionszeitStd: 4, pikett }];
  const r = vergleiche(anlage, [
    modell("Ohne", 2000, { pakete: paket("keine") }),
    modell("Tag", 2000, { pakete: paket("tag") }),
    modell("Rund um die Uhr", 2000, { pakete: paket("24h") }),
  ]);
  assert.deepEqual(r.standard.map((a) => [a.firma, a.pikett]), [["Rund um die Uhr", "24h"], ["Tag", "tag"], ["Ohne", "keine"]]);
});

test("Vertragsdauer und Kündigungsfrist erscheinen im Angebot, ändern die Reihenfolge nicht", () => {
  const paket = (grundpreisChf: number, vertragsdauerJahre?: number, kuendigungsfristMonate?: number) => [
    { stufe: "standard" as const, grundpreisChf, reaktionszeitStd: 4, pikett: "24h" as const, vertragsdauerJahre, kuendigungsfristMonate },
  ];
  const r = vergleiche(anlage, [
    modell("Kurz", 0, { pakete: paket(2100, 1, 3) }),
    modell("Lang", 0, { pakete: paket(2000, 5, 12) }),
    modell("Alt", 0, { pakete: paket(2050) }),
  ]);
  assert.deepEqual(
    r.standard.map((a) => [a.firma, a.vertragsdauerJahre, a.kuendigungsfristMonate]),
    [["Lang", 5, 12], ["Alt", undefined, undefined], ["Kurz", 1, 3]],
    "Reihenfolge nur nach Preis, Service und Bewertung",
  );
  assert.equal(laufzeitText(r.standard[0]), "5 Jahre, Kündigungsfrist 12 Monate");
  assert.equal(laufzeitText(r.standard[1]), "Dauer nicht angegeben");
  assert.equal(laufzeitText({ vertragsdauerJahre: 1, kuendigungsfristMonate: 1 }), "1 Jahr, Kündigungsfrist 1 Monat");
});

test("CHF-Format mit Schweizer Tausendertrennzeichen", () => {
  assert.match(chf(12500), /^CHF 12.500$/);
});

test("Einzugsgebiet nach Bezirken, nur im Kanton Zürich", () => {
  const nurUster = modell("U", 1000, { bezirke: ["Uster"], plzPraefixe: undefined });
  assert.equal(deckt(nurUster, { ...anlage, plz: "8610" }), true, "Uster liegt im Bezirk Uster");
  assert.equal(deckt(nurUster, { ...anlage, plz: "8004" }), false, "Zürich-Aussersihl liegt im Bezirk Zürich");
  assert.equal(deckt(nurUster, { ...anlage, plz: "8044" }), true, "8044 gehört zu Zürich und Uster (Gockhausen)");
  // Ausserhalb des Kantons nie, auch wenn eine Firma den ganzen Kanton abdeckt.
  assert.equal(deckt(modell("Z", 1000), { ...anlage, plz: "3000" }), false, "Bern");
  assert.equal(deckt(modell("Z", 1000), { ...anlage, plz: "8200" }), false, "Schaffhausen");
  // Gespeicherte Bezirke gelten vor den früheren PLZ-Kreisen.
  assert.equal(deckt(modell("B", 1000, { bezirke: ["Meilen"], plzPraefixe: ["8"] }), { ...anlage, plz: "8004" }), false);
  // Früheres Preismodell mit PLZ-Kreis „80“: gilt weiter nur für PLZ 80xx.
  assert.equal(deckt(modell("A", 1000, { plzPraefixe: ["80"] }), { ...anlage, plz: "8004" }), true);
  assert.equal(deckt(modell("A", 1000, { plzPraefixe: ["80"] }), { ...anlage, plz: "8610" }), false);
});
