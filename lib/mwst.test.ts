import { test } from "node:test";
import assert from "node:assert/strict";
import { chfRappen, inklMwst, inklMwstText, MWST_SATZ_TEXT } from "./mwst.ts";

test("MWST: Betrag inkl. MWST auf 5 Rappen gerundet", () => {
  assert.equal(inklMwst(100), 108.1);
  assert.equal(inklMwst(160), 172.95); // 172.96 → 172.95
  assert.equal(inklMwst(2330), 2518.75); // 2518.73 → 2518.75
  assert.equal(inklMwst(0), 0);
});

test("MWST: Anzeige mit Rappen und Apostroph", () => {
  assert.equal(chfRappen(2518.75), "CHF 2'518.75");
  assert.equal(chfRappen(108.1), "CHF 108.10");
  assert.equal(chfRappen(1234567), "CHF 1'234'567.00");
  assert.equal(MWST_SATZ_TEXT, "8,1 %");
  assert.equal(inklMwstText(160), "inkl. 8,1 % MWST: CHF 172.95");
});
