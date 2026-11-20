// Datenbanktests: laufen gegen eine echte PostgreSQL-Datenbank (TEST_DATABASE_URL).
// Ohne TEST_DATABASE_URL werden sie übersprungen; die übrigen Tests laufen trotzdem.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { SCHEMA, type Db } from "./db.ts";
import { tokenHash } from "./passwort.ts";
import {
  aktivePreismodelle,
  anfrageAnlegen,
  anfragenListe,
  kontoAnlegen,
  kontoMitHashPerEmail,
  kontoPerSitzung,
  kontoStatusSetzen,
  preismodellSpeichern,
  sitzungAnlegen,
  sitzungLoeschen,
} from "./repo.ts";
import type { Anlage, PreismodellDaten } from "./pricing.ts";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL nicht gesetzt";
let client: pg.Client;
let d: Db;

before(async () => {
  if (!url) return;
  client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS test_repo CASCADE; CREATE SCHEMA test_repo; SET search_path TO test_repo;");
  await client.query(SCHEMA);
  d = client as unknown as Db;
});

after(async () => {
  if (!url) return;
  await client.query("DROP SCHEMA IF EXISTS test_repo CASCADE");
  await client.end();
});

const DATEN: PreismodellDaten = {
  plzPraefixe: ["8"],
  hersteller: "alle",
  antriebe: ["seil"],
  pakete: [{ stufe: "basis", grundpreisChf: 1000, reaktionszeitStd: 24 }],
  zuschlaege: { proHaltestelleUeber4Chf: 0, hydraulikChf: 0, alterUeber25JahreChf: 0, brandfallsteuerungChf: 0, proKabinenabschlusstuerChf: 0 },
  optionen: { fernueberwachung: null, verfuegbarkeit: null, ausserhalb: null },
};

const ANLAGE: Anlage = {
  gebaeudetyp: "Büro",
  plz: "8004",
  anzahlAufzuege: 1,
  aufzugsart: "Personenaufzug",
  antrieb: "seil",
  hersteller: "KONE",
  haltestellen: 5,
  brandfallsteuerung: "nein",
};

test("Konto, Sitzung, Freischaltung, Preismodell und Anfrage", { skip }, async () => {
  const k = await kontoAnlegen(d, { firma: "Test AG", uid: "CHE-123.456.789", email: "Info@Test.ch", passwortHash: "x" });
  assert.equal(k.status, "pruefung");
  assert.equal((await kontoMitHashPerEmail(d, "info@test.ch"))?.id, k.id, "E-Mail ohne Gross-/Kleinschreibung");

  await sitzungAnlegen(d, tokenHash("t1"), k.id);
  assert.equal((await kontoPerSitzung(d, tokenHash("t1")))?.id, k.id);
  await sitzungLoeschen(d, tokenHash("t1"));
  assert.equal(await kontoPerSitzung(d, tokenHash("t1")), null);

  await preismodellSpeichern(d, k.id, DATEN, true);
  assert.equal((await aktivePreismodelle(d)).length, 0, "nicht freigeschaltet → nicht sichtbar");

  await kontoStatusSetzen(d, k.id, "aktiv");
  const aktiv = await aktivePreismodelle(d);
  assert.equal(aktiv.length, 1);
  assert.equal(aktiv[0].firma, "Test AG");
  assert.equal(aktiv[0].firmaId, k.id);

  await preismodellSpeichern(d, k.id, DATEN, false);
  assert.equal((await aktivePreismodelle(d)).length, 0, "nicht veröffentlicht → nicht sichtbar");

  await anfrageAnlegen(d, { kontoId: k.id, stufe: "basis", preisChf: 1090, anlage: ANLAGE, name: "Eva Muster", email: "eva@example.com", telefon: "", adresse: "" });
  const eigene = await anfragenListe(d, k.id);
  assert.equal(eigene.length, 1);
  assert.equal(eigene[0].anlage.hersteller, "KONE");
  assert.equal((await anfragenListe(d)).length, 1);
  assert.equal((await anfragenListe(d, k.id + 999)).length, 0);
});
