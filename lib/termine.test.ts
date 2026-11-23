import { test } from "node:test";
import assert from "node:assert/strict";
import { feiertageZuerich, heuteInZuerich, istArbeitstag, kalenderTage, startzeiten, terminGueltig, terminText } from "./termine.ts";

test("Startzeiten: 1 Stunde, 7 bis 17 Uhr", () => {
  assert.deepEqual(startzeiten(60), ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]);
  assert.deepEqual(startzeiten(120), ["07:00", "09:00", "11:00", "13:00", "15:00"]);
});

test("Heute in der Schweiz, auch wenn der Server in UTC läuft", () => {
  assert.equal(heuteInZuerich(new Date("2026-11-23T22:30:00Z")), "2026-11-23");
  assert.equal(heuteInZuerich(new Date("2026-11-23T23:30:00Z")), "2026-11-24"); // 00:30 in Zürich
  assert.equal(heuteInZuerich(new Date("2026-07-01T22:30:00Z")), "2026-07-02"); // Sommerzeit
});

test("Wochenenden und Feiertage im Kanton Zürich sind keine Arbeitstage", () => {
  assert.equal(istArbeitstag("2026-11-23"), true); // Montag
  assert.equal(istArbeitstag("2026-11-28"), false); // Samstag
  assert.equal(istArbeitstag("2026-12-25"), false); // Weihnachten
  const f = feiertageZuerich(2027);
  assert.ok(f.has("2027-03-26"), "Karfreitag 2027");
  assert.ok(f.has("2027-03-29"), "Ostermontag 2027");
  assert.ok(f.has("2027-05-06"), "Auffahrt 2027");
  assert.ok(f.has("2027-05-17"), "Pfingstmontag 2027");
});

test("Buchbar ab morgen, nur Arbeitstage, nur volle Startzeiten", () => {
  const heute = "2026-11-23";
  assert.equal(kalenderTage(heute)[0], "2026-11-24");
  assert.equal(terminGueltig("2026-11-24", "08:00", heute), true);
  assert.equal(terminGueltig("2026-11-23", "08:00", heute), false, "heute nicht mehr");
  assert.equal(terminGueltig("2026-11-28", "08:00", heute), false, "Samstag");
  assert.equal(terminGueltig("2026-11-24", "08:30", heute), false, "keine halben Stunden");
  assert.equal(terminGueltig("2026-11-24", "17:00", heute), false, "endet nach 17 Uhr");
  assert.equal(terminGueltig("2027-03-01", "08:00", heute), false, "zu weit im Voraus");
  assert.equal(terminGueltig("2026-02-30", "08:00", "2026-02-01"), false, "kein echtes Datum");
});

test("Termin als Text", () => {
  assert.equal(terminText("2026-11-24", "08:00"), "Dienstag, 24. November 2026, 08:00–09:00 Uhr");
});
