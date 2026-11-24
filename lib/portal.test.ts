import { test } from "node:test";
import assert from "node:assert/strict";
import { emailFehler, hashPasswort, pruefePasswort, passwortFehler, tokenHash } from "./passwort.ts";
import { leseFormular } from "./preismodellForm.ts";

function formular(werte: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(werte)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

const GUELTIG = {
  plz: ["8", "9"],
  hersteller_alle: "on",
  antrieb_seil: "on",
  standard_angeboten: "on",
  standard_grundpreis: "2'150",
  standard_reaktion: "4",
  standard_pikett: "tag",
  standard_dauer: "3",
  standard_frist: "6",
  z_halte: "90",
  z_hydraulik: "150",
  z_alter: "300",
  z_brandfall: "120",
  z_tuer: "80",
  z_sicherheit: "60",
  veroeffentlicht: "on",
};

test("Passwort-Hash prüft richtig und falsch", async () => {
  const h = await hashPasswort("ein-langes-passwort");
  assert.ok(h.startsWith("scrypt$"));
  assert.equal(await pruefePasswort("ein-langes-passwort", h), true);
  assert.equal(await pruefePasswort("falsch-falsch", h), false);
  assert.equal(await pruefePasswort("x", "kaputt"), false);
});

test("Kurze Passwörter werden abgelehnt", () => {
  assert.ok(passwortFehler("kurz"));
  assert.equal(passwortFehler("lang-genug-123"), null);
  assert.ok(emailFehler("liftvergleich.ch"));
  assert.ok(emailFehler("info@liftvergleich"));
  assert.equal(emailFehler("info@liftvergleich.ch"), null);
});

test("Token wird nur als Hash gespeichert", () => {
  assert.match(tokenHash("abc"), /^[0-9a-f]{64}$/);
  assert.notEqual(tokenHash("abc"), "abc");
});

test("Gültiges Preisformular ergibt ein Preismodell", () => {
  const r = leseFormular(formular(GUELTIG));
  assert.deepEqual(r.fehler, []);
  assert.equal(r.veroeffentlicht, true);
  assert.deepEqual(r.daten?.plzPraefixe, ["8", "9"]);
  assert.equal(r.daten?.hersteller, "alle");
  assert.deepEqual(r.daten?.antriebe, ["seil"]);
  assert.deepEqual(r.daten?.pakete, [
    { stufe: "standard", grundpreisChf: 2150, reaktionszeitStd: 4, pikett: "tag", vertragsdauerJahre: 3, kuendigungsfristMonate: 6 },
  ]);
  assert.equal(r.daten?.zuschlaege.proHaltestelleUeber4Chf, 90);
  assert.equal(r.daten?.zuschlaege.sicherheitsdispositivChf, 60);
  assert.equal(r.daten?.optionen.fernueberwachung, null);
});

test("Fehlende Pflichtangaben werden gemeldet", () => {
  const r = leseFormular(formular({ z_halte: "0", z_hydraulik: "0", z_alter: "0", z_brandfall: "0", z_tuer: "0", z_sicherheit: "0" }));
  assert.equal(r.daten, null);
  assert.equal(r.fehler.length, 4); // Einzugsgebiet, Hersteller, Antriebe, Pakete
});

test("Ungültige Zahlen werden gemeldet", () => {
  const r = leseFormular(formular({ ...GUELTIG, standard_grundpreis: "abc", standard_reaktion: "999" }));
  assert.equal(r.daten, null);
  assert.equal(r.fehler.length, 2);
});

test("Unbekannte Pikett-Deckung wird gemeldet", () => {
  const r = leseFormular(formular({ ...GUELTIG, standard_pikett: "nachts" }));
  assert.equal(r.daten, null);
  assert.deepEqual(r.fehler, ["Standard: bitte die Pikett-Deckung wählen."]);
});

test("Vertragsdauer und Kündigungsfrist müssen gewählt werden", () => {
  const { standard_dauer, standard_frist, ...ohne } = GUELTIG;
  void standard_dauer;
  void standard_frist;
  const r = leseFormular(formular(ohne));
  assert.equal(r.daten, null);
  assert.deepEqual(r.fehler, ["Standard: bitte die Vertragsdauer wählen.", "Standard: bitte die Kündigungsfrist wählen."]);
});

test("Vertragsdauer nur 1 bis 5 Jahre, Kündigungsfrist nur aus der Auswahl", () => {
  for (const dauer of ["0", "6", "2.5", "abc"]) {
    assert.deepEqual(leseFormular(formular({ ...GUELTIG, standard_dauer: dauer })).fehler, ["Standard: bitte die Vertragsdauer wählen."], dauer);
  }
  assert.deepEqual(leseFormular(formular({ ...GUELTIG, standard_frist: "2" })).fehler, ["Standard: bitte die Kündigungsfrist wählen."]);
  for (const dauer of ["1", "5"]) assert.deepEqual(leseFormular(formular({ ...GUELTIG, standard_dauer: dauer })).fehler, []);
});

test("Ausgewählte Hersteller statt alle", () => {
  const { hersteller_alle, ...rest } = GUELTIG;
  void hersteller_alle;
  const r = leseFormular(formular({ ...rest, hersteller: ["Schindler", "KONE"] }));
  assert.deepEqual(r.daten?.hersteller, ["Schindler", "KONE"]);
});
