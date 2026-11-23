import { test } from "node:test";
import assert from "node:assert/strict";
import { herstellerGruppe, herstellerSuchliste, schonGelistet, suchtext } from "./stammdaten.ts";
import { deckt, type Anlage, type Preismodell } from "./pricing.ts";

test("Suchliste: alle Hersteller alphabetisch, die 6 grossen inklusive", () => {
  const liste = herstellerSuchliste();
  assert.equal(liste.length, 21);
  assert.equal(liste[0], "AS Aufzüge");
  assert.ok(liste.includes("Schindler") && liste.includes("Garaventa"));
  assert.ok(liste.indexOf("Lödige") < liste.indexOf("Lüthi"), "Umlaute richtig sortiert");
});

test("Suche findet auch ohne Umlaute", () => {
  assert.ok(suchtext("Högg").includes(suchtext("hogg")));
  assert.ok(suchtext("Lödige").includes(suchtext("LOD")));
});

test("Registrierte Firmen erscheinen nur einmal", () => {
  const liste = ["Schindler", "KONE", "TK Elevator", "Garaventa", "Lift AG", "Rigert (Treppenlifte)", "Lifttech"];
  assert.equal(schonGelistet("Schindler Aufzüge AG", liste), true);
  assert.equal(schonGelistet("KONE (Schweiz) AG", liste), true);
  assert.equal(schonGelistet("TK Aufzüge AG", liste), true);
  assert.equal(schonGelistet("Garaventa Liftech AG", liste), true);
  assert.equal(schonGelistet("Rigert AG Treppenlifte", liste), true);
  assert.equal(schonGelistet("LIFTTECH AG", liste), true);
  assert.equal(schonGelistet("Lift AG", liste), true);
  assert.equal(schonGelistet("Muster Lift AG", liste), false);
  assert.equal(schonGelistet("Lift Experts GmbH", liste), false);
  const mit = herstellerSuchliste(["Muster Lift AG", "Schindler Aufzüge AG", "  "]);
  assert.equal(mit.length, 22);
  assert.ok(mit.includes("Muster Lift AG"));
});

test("Kleinere Hersteller zählen bei den Liftfirmen als „Andere“", () => {
  assert.equal(herstellerGruppe("Schindler"), "Schindler");
  assert.equal(herstellerGruppe("unbekannt"), "unbekannt");
  assert.equal(herstellerGruppe("Garaventa"), "Andere");
  assert.equal(herstellerGruppe("Selbst eingetippt"), "Andere");
  const modell = { plzPraefixe: ["8"], antriebe: ["seil", "hydraulik"], hersteller: ["Schindler", "Andere"] } as unknown as Preismodell;
  const anlage = (hersteller: string) => ({ plz: "8049", antrieb: "seil", hersteller }) as Anlage;
  assert.equal(deckt(modell, anlage("Garaventa")), true);
  assert.equal(deckt(modell, anlage("Schindler")), true);
  assert.equal(deckt(modell, anlage("KONE")), false);
  assert.equal(deckt({ ...modell, hersteller: ["KONE"] }, anlage("Garaventa")), false);
});
