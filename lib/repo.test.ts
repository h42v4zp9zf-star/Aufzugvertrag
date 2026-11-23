// Datenbanktests: laufen gegen eine echte PostgreSQL-Datenbank (TEST_DATABASE_URL).
// Ohne TEST_DATABASE_URL werden sie übersprungen; die übrigen Tests laufen trotzdem.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { adminAusUmgebung, SCHEMA, type Db } from "./db.ts";
import { pruefePasswort, tokenHash } from "./passwort.ts";
import {
  aktivePreismodelle,
  anfrageAnlegen,
  anfragenListe,
  beratungAnlegen,
  beratungenListe,
  belegteTermine,
  kontoAnlegen,
  kontoMitHashPerEmail,
  kontoPerSitzung,
  kontoStatusSetzen,
  preismodellLaden,
  preismodellSpeichern,
  sitzungAnlegen,
  sitzungLoeschen,
  TerminVergeben,
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
  pakete: [{ stufe: "basis", grundpreisChf: 1000, reaktionszeitStd: 24, pikett: "tag" }],
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
  assert.equal(aktiv[0].pakete[0].pikett, "tag");

  await preismodellSpeichern(d, k.id, DATEN, false);
  assert.equal((await aktivePreismodelle(d)).length, 0, "nicht veröffentlicht → nicht sichtbar");

  await anfrageAnlegen(d, { kontoId: k.id, stufe: "basis", preisChf: 1090, anlage: ANLAGE, name: "Eva Muster", email: "eva@example.com", telefon: "", adresse: "" });
  const eigene = await anfragenListe(d, k.id);
  assert.equal(eigene.length, 1);
  assert.equal(eigene[0].anlage.hersteller, "KONE");
  assert.equal((await anfragenListe(d)).length, 1);
  assert.equal((await anfragenListe(d, k.id + 999)).length, 0);
});

test("Verwaltungskonto aus ADMIN_EMAIL und ADMIN_PASSWORT", { skip }, async () => {
  await adminAusUmgebung(d, { ADMIN_EMAIL: "Chef@Example.ch", ADMIN_PASSWORT: "erstes-passwort-1" });
  let k = await kontoMitHashPerEmail(d, "chef@example.ch");
  assert.equal(k?.rolle, "admin");
  assert.equal(k?.status, "aktiv");
  assert.ok(await pruefePasswort("erstes-passwort-1", k!.passwort_hash));

  // Zweiter Start mit gleichem Passwort: nichts ändert sich, kein Fehler.
  await adminAusUmgebung(d, { ADMIN_EMAIL: "chef@example.ch", ADMIN_PASSWORT: "erstes-passwort-1" });

  // Neues Passwort in den Einstellungen: gilt nach dem nächsten Start.
  await adminAusUmgebung(d, { ADMIN_EMAIL: "chef@example.ch", ADMIN_PASSWORT: "neues-passwort-22" });
  k = await kontoMitHashPerEmail(d, "chef@example.ch");
  assert.ok(await pruefePasswort("neues-passwort-22", k!.passwort_hash));

  // Zu kurzes Passwort oder fehlende Angaben: es wird nichts angelegt.
  await adminAusUmgebung(d, { ADMIN_EMAIL: "kurz@example.ch", ADMIN_PASSWORT: "kurz" });
  await adminAusUmgebung(d, {});
  assert.equal(await kontoMitHashPerEmail(d, "kurz@example.ch"), null);

  // Eine Liftfirma mit derselben E-Mail wird nie zum Admin gemacht.
  await kontoAnlegen(d, { firma: "Lift AG", uid: "CHE-999.888.777", email: "firma@example.ch", passwortHash: "x" });
  await adminAusUmgebung(d, { ADMIN_EMAIL: "firma@example.ch", ADMIN_PASSWORT: "irgendein-passwort" });
  assert.equal((await kontoMitHashPerEmail(d, "firma@example.ch"))?.rolle, "firma");
  assert.equal((await kontoMitHashPerEmail(d, "firma@example.ch"))?.passwort_hash, "x");
});

test("Beratung vor Ort wird gespeichert", { skip }, async () => {
  await beratungAnlegen(d, { name: "Max Muster", email: "max@example.com", telefon: "079 000 00 00", adresse: "Seestrasse 1, 8800 Thalwil", anzahlAufzuege: 2, bemerkung: "Bitte vormittags" });
  const liste = await beratungenListe(d);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].anzahl_aufzuege, 2);
  assert.equal(liste[0].bemerkung, "Bitte vormittags");
});

test("Früher gespeicherte Pakete ohne Pikett-Angabe bekommen die bisherige Deckung", { skip }, async () => {
  const k = await kontoAnlegen(d, { firma: "Alt AG", uid: "CHE-111.111.111", email: "alt@example.ch", passwortHash: "x" });
  await kontoStatusSetzen(d, k.id, "aktiv");
  const alt = {
    ...DATEN,
    pakete: [
      { stufe: "basis", grundpreisChf: 1000, reaktionszeitStd: 24 },
      { stufe: "standard", grundpreisChf: 2000, reaktionszeitStd: 4 },
    ],
  } as unknown as PreismodellDaten;
  await preismodellSpeichern(d, k.id, alt, true);
  const m = (await aktivePreismodelle(d)).find((x) => x.firmaId === k.id)!;
  assert.deepEqual(m.pakete.map((p) => p.pikett), ["keine", "24h"]);
  assert.deepEqual((await preismodellLaden(d, k.id))?.daten.pakete.map((p) => p.pikett), ["keine", "24h"]);
});

test("Fester Termin: wird gespeichert, ist danach belegt und kann nicht doppelt gebucht werden", { skip }, async () => {
  const kunde = { name: "Lea Muster", email: "lea@example.com", telefon: "079 111 11 11", adresse: "Bahnhofstrasse 1, 8001 Zürich", anzahlAufzuege: 1, bemerkung: "" };
  await beratungAnlegen(d, { ...kunde, termin: { datum: "2026-11-24", zeit: "08:00" } });
  await beratungAnlegen(d, { ...kunde, termin: { datum: "2026-11-24", zeit: "09:00" } });
  assert.deepEqual((await belegteTermine(d, "2026-11-24", "2026-11-30")).sort(), ["2026-11-24 08:00", "2026-11-24 09:00"]);
  assert.deepEqual(await belegteTermine(d, "2026-11-25", "2026-11-30"), []);
  await assert.rejects(beratungAnlegen(d, { ...kunde, name: "Zweiter Kunde", termin: { datum: "2026-11-24", zeit: "08:00" } }), TerminVergeben);
  const liste = await beratungenListe(d);
  assert.equal(liste[0].termin_datum, "2026-11-24");
  assert.equal(liste[0].termin_zeit, "09:00");
  assert.equal(liste.at(-1)?.termin_datum, null, "ältere Buchung ohne Termin steht am Schluss");
});
