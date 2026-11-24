import { test } from "node:test";
import assert from "node:assert/strict";
import { BEZIRKE, bezirkeAusPlzKreisen, bezirkeText, bezirkeVon, imKantonZuerich } from "./zuerich.ts";

test("Kanton Zürich: bekannte Postleitzahlen und ihre Bezirke", () => {
  assert.deepEqual(bezirkeVon("8049"), ["Zürich"]);
  assert.deepEqual(bezirkeVon(" 8400 "), ["Winterthur"]);
  assert.deepEqual(bezirkeVon("8610"), ["Uster"]);
  assert.deepEqual(bezirkeVon("8820"), ["Horgen"]);
  assert.deepEqual(bezirkeVon("8180"), ["Bülach"]);
  assert.deepEqual(bezirkeVon("8952"), ["Dietikon"]);
  assert.deepEqual(bezirkeVon("8044"), ["Uster", "Zürich"], "8044 liegt in zwei Bezirken");
  assert.equal(BEZIRKE.length, 12);
  for (const b of BEZIRKE) assert.ok(bezirkeAusPlzKreisen(["8"]).includes(b), `${b} hat Postleitzahlen`);
});

test("Kanton Zürich: Postleitzahlen ausserhalb zählen nicht", () => {
  for (const plz of ["3000", "6003", "8200", "8212", "8500", "8546", "9000", "8750", "", "80", "abcd"]) {
    assert.equal(imKantonZuerich(plz), false, plz);
  }
  assert.equal(imKantonZuerich("8001"), true);
  assert.equal(imKantonZuerich("8825"), true, "Hütten gehört zu Zürich, auch wenn ein Teil in Schwyz liegt");
});

test("Alte PLZ-Kreise werden in Bezirke umgerechnet", () => {
  assert.equal(bezirkeAusPlzKreisen(["8"]).length, 12);
  assert.deepEqual(bezirkeAusPlzKreisen(["3", "9"]), []);
  assert.deepEqual(bezirkeAusPlzKreisen([]), []);
});

test("Bezirke als Text", () => {
  assert.equal(bezirkeText([...BEZIRKE]), "Ganzer Kanton Zürich");
  assert.equal(bezirkeText(["Zürich", "Uster"]), "Bezirke Uster, Zürich");
  assert.equal(bezirkeText(["Meilen"]), "Bezirk Meilen");
  assert.equal(bezirkeText([]), "Kein Bezirk gewählt");
});
