// Schutz vor Spam und Passwort-Raten (Verbesserung Nr. 32).
// Die Datenbanktests laufen nur mit TEST_DATABASE_URL, die übrigen immer.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { SCHEMA, type Db } from "./db.ts";
import { GRENZEN, ipSchluessel, schluessel, versuchMerken, versucheLoeschen, zuViele } from "./schutz.ts";
import { istSpam } from "./spamfalle.ts";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL nicht gesetzt";
let client: pg.Client;
let d: Db;

before(async () => {
  if (!url) return;
  client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS test_schutz CASCADE; CREATE SCHEMA test_schutz; SET search_path TO test_schutz;");
  await client.query(SCHEMA);
  d = client as unknown as Db;
});

after(async () => {
  if (!url) return;
  await client.query("DROP SCHEMA IF EXISTS test_schutz CASCADE");
  await client.end();
});

test("Spam-Falle: nur ein ausgefülltes Feld zählt als Spam", () => {
  assert.equal(istSpam(null), false);
  assert.equal(istSpam(undefined), false);
  assert.equal(istSpam(""), false);
  assert.equal(istSpam("   "), false);
  assert.equal(istSpam("https://spam.example"), true);
});

test("Anschluss und E-Mail werden nur als Prüfsumme gespeichert", () => {
  const a = ipSchluessel(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
  const b = ipSchluessel(new Headers({ "x-forwarded-for": "203.0.113.7" }));
  const c = ipSchluessel(new Headers({ "x-forwarded-for": "198.51.100.2" }));
  assert.equal(a, b, "nur die erste Adresse zählt");
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(ipSchluessel(new Headers({ "x-real-ip": "203.0.113.7" })), a, "x-real-ip als Ersatz");
  assert.equal(ipSchluessel(new Headers()), ipSchluessel(new Headers()), "ohne Kopfzeile ein fester Wert");
  assert.equal(schluessel(" Info@Firma.example "), schluessel("info@firma.example"), "Gross-/Kleinschreibung egal");
  assert.ok(!schluessel("info@firma.example").includes("firma"));
});

test("Grenze: nach der erlaubten Anzahl gesperrt, nur für diese Art und diesen Schlüssel", { skip }, async () => {
  const k = schluessel("info@firma.example");
  for (let i = 0; i < GRENZEN["login-email"].max - 1; i++) await versuchMerken(d, "login-email", k);
  assert.equal(await zuViele(d, "login-email", k), false);
  await versuchMerken(d, "login-email", k);
  assert.equal(await zuViele(d, "login-email", k), true);
  assert.equal(await zuViele(d, "login-email", schluessel("andere@firma.example")), false);
  assert.equal(await zuViele(d, "login-ip", k), false);
  await versucheLoeschen(d, "login-email", k);
  assert.equal(await zuViele(d, "login-email", k), false, "nach erfolgreicher Anmeldung wieder frei");
});

test("Grenze: alte Versuche zählen nicht mehr und werden nach einem Tag gelöscht", { skip }, async () => {
  const k = schluessel("ip:198.51.100.9");
  for (let i = 0; i < GRENZEN.beratung.max; i++) await versuchMerken(d, "beratung", k);
  assert.equal(await zuViele(d, "beratung", k), true);
  await d.query("UPDATE versuche SET zeit = now() - interval '61 minutes' WHERE schluessel = $1", [k]);
  assert.equal(await zuViele(d, "beratung", k), false, "nach einer Stunde wieder frei");
  await d.query("UPDATE versuche SET zeit = now() - interval '2 days' WHERE schluessel = $1", [k]);
  await versuchMerken(d, "beratung", schluessel("ip:198.51.100.10"));
  const { rows } = await d.query<{ n: string }>("SELECT count(*) AS n FROM versuche WHERE schluessel = $1", [k]);
  assert.equal(Number(rows[0].n), 0);
});
