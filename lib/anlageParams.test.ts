import { test } from "node:test";
import assert from "node:assert/strict";
import { fromParams, toParams } from "./anlageParams.ts";
import type { Anlage } from "./pricing.ts";

const ANLAGE: Anlage = {
  gebaeudetyp: "Mehrfamilienhaus",
  plz: "8049",
  anzahlAufzuege: 1,
  aufzugsart: "Personenaufzug",
  antrieb: "hydraulik",
  hersteller: "unbekannt",
  haltestellen: 5,
  brandfallsteuerung: "nein",
  attika: "ja",
};

test("Attika geht über den Link zum Vergleich nicht verloren", () => {
  assert.equal(fromParams(toParams(ANLAGE))?.attika, "ja");
  assert.equal(fromParams(toParams({ ...ANLAGE, attika: "nein" }))?.attika, "nein");
});

test("Alte Links ohne Attika-Angabe funktionieren weiter", () => {
  const p = toParams({ ...ANLAGE, attika: undefined });
  assert.equal(p.has("attika"), false);
  assert.equal(fromParams(p)?.attika, undefined);
  p.set("attika", "vielleicht");
  assert.equal(fromParams(p)?.attika, undefined);
});

test("Hersteller aus dem Link: eigener Name wird gekürzt, leer gilt als unbekannt", () => {
  const basis = "plz=8049&halte=5";
  assert.equal(fromParams(new URLSearchParams(basis + "&hersteller=Garaventa"))?.hersteller, "Garaventa");
  assert.equal(fromParams(new URLSearchParams(basis + "&hersteller=%20"))?.hersteller, "unbekannt");
  assert.equal(fromParams(new URLSearchParams(basis + "&hersteller=" + "x".repeat(200)))?.hersteller.length, 80);
});
