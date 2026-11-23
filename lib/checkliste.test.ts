import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FOTOS_MAX,
  anlageAusCheckliste,
  checklisteBereinigen,
  leereCheckliste,
  pflichtFehler,
  plzAusAdresse,
} from "./checkliste.ts";

test("Leere Checkliste: so viele Aufzüge wie gebucht (1 bis 10), Name für die Unterschrift", () => {
  assert.equal(leereCheckliste(3).aufzuege.length, 3);
  assert.equal(leereCheckliste(0).aufzuege.length, 1);
  assert.equal(leereCheckliste(50).aufzuege.length, 10);
  assert.deepEqual(leereCheckliste(2).aufzuege.map((a) => a.bezeichnung), ["Aufzug 1", "Aufzug 2"]);
  assert.equal(leereCheckliste(1, "Sandra Keller").abschluss.unterschriftName, "Sandra Keller");
});

test("Bereinigen: ungültige Auswahl, fremde Felder, zu lange Texte, falsche Fotos und Unterschrift fallen weg", () => {
  const d = checklisteBereinigen(
    {
      boese: "<script>",
      kontakt: { rolle: "chef", ansprechperson: "x".repeat(500) },
      liegenschaft: { attika: "ja", gebaeudetyp: "Schloss" },
      aufzuege: [
        { id: "a1", antrieb: "rakete", haltestellen: 6, hersteller: "", zustand: { kabine: "gut", tueren: "super" } },
        { id: "a1", antrieb: "seil" },
        { id: "../x", antrieb: "seil" },
      ],
      fotos: [
        { id: "f1", aufzug: "a1", stelle: "grube", notiz: "ok" },
        { id: "f1", aufzug: "a1", stelle: "grube" },
        { id: "f2", aufzug: "gibtsnicht", stelle: "grube" },
        { id: "f3", aufzug: "a1", stelle: "dach" },
      ],
      wartung: { zufriedenheit: 9 },
      abschluss: { unterschrift: "javascript:alert(1)", schritte: { vergleichen: "ja", kuendigen: true } },
    },
    2,
  );
  assert.equal((d as unknown as Record<string, unknown>).boese, undefined);
  assert.equal(d.kontakt.rolle, "");
  assert.equal(d.kontakt.ansprechperson.length, 200);
  assert.equal(d.liegenschaft.attika, "ja");
  assert.equal(d.liegenschaft.gebaeudetyp, "");
  assert.equal(d.aufzuege.length, 1, "doppelte und ungültige Kennungen weg");
  assert.equal(d.aufzuege[0].antrieb, "");
  assert.equal(d.aufzuege[0].haltestellen, "", "Zahl statt Text wird nicht übernommen");
  assert.equal(d.aufzuege[0].hersteller, "unbekannt");
  assert.equal(d.aufzuege[0].zustand.kabine, "gut");
  assert.equal(d.aufzuege[0].zustand.tueren, "");
  assert.deepEqual(d.fotos.map((f) => f.id), ["f1"]);
  assert.equal(d.wartung.zufriedenheit, 0);
  assert.equal(d.abschluss.unterschrift, "");
  assert.deepEqual(d.abschluss.schritte, { vergleichen: false, kuendigen: true, kontrollbericht: false });
});

test("Bereinigen: höchstens 30 Fotos, gültige Unterschrift bleibt", () => {
  const fotos = Array.from({ length: 40 }, (_, i) => ({ id: `f${i}`, aufzug: "a1", stelle: "kabine", notiz: "" }));
  const sig = "data:image/png;base64,iVBORw0KGgo=";
  const d = checklisteBereinigen({ aufzuege: [{ id: "a1" }], fotos, abschluss: { unterschrift: sig } });
  assert.equal(d.fotos.length, FOTOS_MAX);
  assert.equal(d.abschluss.unterschrift, sig);
});

test("Ohne Pflichtangaben kein Abschluss", () => {
  const d = leereCheckliste(2);
  d.abschluss.abgeschlossenAm = new Date().toISOString();
  assert.deepEqual(pflichtFehler(d), [
    "Aufzug 1: Antrieb fehlt",
    "Aufzug 1: Anzahl Haltestellen fehlt",
    "Aufzug 2: Antrieb fehlt",
    "Aufzug 2: Anzahl Haltestellen fehlt",
  ]);
  assert.equal(checklisteBereinigen(d, 2).abschluss.abgeschlossenAm, "", "Server nimmt den Abschluss zurück");
  for (const a of d.aufzuege) {
    a.antrieb = "hydraulik";
    a.haltestellen = "4";
  }
  assert.deepEqual(pflichtFehler(d), []);
  assert.notEqual(checklisteBereinigen(d, 2).abschluss.abgeschlossenAm, "");
});

test("Anlage für den Angebotsvergleich aus der Checkliste", () => {
  assert.equal(plzAusAdresse("Seestrasse 12, 8004 Zürich"), "8004");
  assert.equal(plzAusAdresse("Hauptstrasse 1000, 8953 Dietikon"), "8953");
  assert.equal(plzAusAdresse("ohne Zahl"), null);

  const d = leereCheckliste(2);
  assert.equal(anlageAusCheckliste(d, "Seestrasse 12, 8004 Zürich"), null, "ohne Pflichtangaben");
  Object.assign(d.aufzuege[0], { antrieb: "seil", haltestellen: "6", hersteller: "Schindler", baujahr: "1998", geschwindigkeit: "1,6", traglastKg: "630" });
  d.liegenschaft.attika = "ja";
  const a = anlageAusCheckliste(d, "Seestrasse 12, 8004 Zürich");
  assert.deepEqual(a, {
    gebaeudetyp: "Mehrfamilienhaus",
    plz: "8004",
    anzahlAufzuege: 2,
    aufzugsart: "Personenaufzug",
    antrieb: "seil",
    hersteller: "Schindler",
    haltestellen: 6,
    brandfallsteuerung: "unbekannt",
    attika: "ja",
    baujahr: 1998,
    traglastKg: 630,
    geschwindigkeitMs: 1.6,
  });
});
