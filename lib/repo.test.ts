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
  beratungLaden,
  checklisteLaden,
  checklisteSpeichern,
  dokumentLaden,
  fotoIds,
  fotoLaden,
  fotoSpeichern,
  vorschauBilder,
  firmenNamen,
  kontoAnlegen,
  kontoMitHashPerEmail,
  kontoPerSitzung,
  kontoStatusSetzen,
  preismodellLaden,
  preismodellSpeichern,
  sitzungAnlegen,
  sitzungLoeschen,
  TerminVergeben,
  firmaLaden,
  UNTERLAGEN_MAX,
  unterlageLaden,
  unterlageLoeschen,
  unterlagenListe,
  unterlageSpeichern,
} from "./repo.ts";
import type { Anlage, PreismodellDaten } from "./pricing.ts";
import { FOTOS_MAX, leereCheckliste, type ChecklisteDaten } from "./checkliste.ts";

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
  pakete: [{ stufe: "basis", grundpreisChf: 1000, reaktionszeitStd: 24, pikett: "tag", vertragsdauerJahre: 3, kuendigungsfristMonate: 6 }],
  zuschlaege: { proHaltestelleUeber4Chf: 0, hydraulikChf: 0, alterUeber25JahreChf: 0, brandfallsteuerungChf: 0, proKabinenabschlusstuerChf: 0, sicherheitsdispositivChf: 0 },
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
  assert.equal(aktiv[0].pakete[0].vertragsdauerJahre, 3);
  assert.equal(aktiv[0].pakete[0].kuendigungsfristMonate, 6);

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

  // E-Mail ohne @ (z. B. nur „liftvergleich.ch“): es wird nichts angelegt.
  await adminAusUmgebung(d, { ADMIN_EMAIL: "liftvergleich.ch", ADMIN_PASSWORT: "langes-passwort-1" });
  assert.equal(await kontoMitHashPerEmail(d, "liftvergleich.ch"), null);

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
  const { sicherheitsdispositivChf: _ohne, ...alteZuschlaege } = { ...DATEN.zuschlaege, proHaltestelleUeber4Chf: 90 };
  const alt = {
    ...DATEN,
    zuschlaege: alteZuschlaege,
    pakete: [
      { stufe: "basis", grundpreisChf: 1000, reaktionszeitStd: 24 },
      { stufe: "standard", grundpreisChf: 2000, reaktionszeitStd: 4 },
    ],
  } as unknown as PreismodellDaten;
  await preismodellSpeichern(d, k.id, alt, true);
  const m = (await aktivePreismodelle(d)).find((x) => x.firmaId === k.id)!;
  assert.deepEqual(m.pakete.map((p) => p.pikett), ["keine", "24h"]);
  assert.deepEqual((await preismodellLaden(d, k.id))?.daten.pakete.map((p) => p.pikett), ["keine", "24h"]);
  // Ohne Zuschlag Sicherheitsdispositiv (vor dem 23.11.2026 gespeichert): 0 Franken.
  assert.equal(m.zuschlaege.sicherheitsdispositivChf, 0);
  assert.equal((await preismodellLaden(d, k.id))?.daten.zuschlaege.sicherheitsdispositivChf, 0);
  assert.equal(m.zuschlaege.proHaltestelleUeber4Chf, 90);
  // Ohne Vertragsdauer (vor dem 23.11.2026 gespeichert): bleibt leer, der Vergleich zeigt «nicht angegeben».
  assert.deepEqual(m.pakete.map((p) => p.vertragsdauerJahre), [undefined, undefined]);
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

test("Dokumente: werden mit der Buchung gespeichert, nur bei erfolgreicher Buchung", { skip }, async () => {
  const kunde = { name: "Urs Muster", email: "urs@example.com", telefon: "079 222 22 22", adresse: "Seefeldstrasse 5, 8008 Zürich", anzahlAufzuege: 1, bemerkung: "" };
  const pdf = Buffer.from("%PDF-1.4\nWartungsvertrag");
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const id = await beratungAnlegen(d, {
    ...kunde,
    termin: { datum: "2026-11-26", zeit: "10:00" },
    dokumente: [
      { dateiname: "Vertrag alt.pdf", typ: "application/pdf", inhalt: pdf },
      { dateiname: "Typenschild.jpg", typ: "image/jpeg", inhalt: jpg },
    ],
  });
  const b = (await beratungenListe(d)).find((x) => x.id === id)!;
  assert.deepEqual(
    b.dokumente.map((x) => [x.dateiname, x.groesse]),
    [["Vertrag alt.pdf", pdf.length], ["Typenschild.jpg", jpg.length]],
  );
  const geladen = await dokumentLaden(d, b.dokumente[1].id);
  assert.equal(geladen?.typ, "image/jpeg");
  assert.deepEqual(geladen?.inhalt, jpg, "Inhalt unverändert");
  assert.equal(await dokumentLaden(d, 999999), null);

  // Termin schon vergeben: weder Buchung noch Dokument wird gespeichert.
  const vorher = (await d.query<{ n: number }>("SELECT count(*)::int AS n FROM beratung_dokumente")).rows[0].n;
  await assert.rejects(
    beratungAnlegen(d, { ...kunde, termin: { datum: "2026-11-26", zeit: "10:00" }, dokumente: [{ dateiname: "x.pdf", typ: "application/pdf", inhalt: pdf }] }),
    TerminVergeben,
  );
  assert.equal((await d.query<{ n: number }>("SELECT count(*)::int AS n FROM beratung_dokumente")).rows[0].n, vorher);

  // Ohne Dokumente: leere Liste.
  const ohne = await beratungAnlegen(d, { ...kunde, termin: { datum: "2026-11-26", zeit: "11:00" } });
  assert.deepEqual((await beratungenListe(d)).find((x) => x.id === ohne)?.dokumente, []);
});

test("Firmennamen für die Hersteller-Liste: ohne Verwaltung und ohne gesperrte", { skip }, async () => {
  const a = await kontoAnlegen(d, { firma: "Zeta Lift AG", uid: "CHE-111.111.111", email: "zeta@example.ch", passwortHash: "x" });
  const b = await kontoAnlegen(d, { firma: "Gesperrt Lift GmbH", uid: "CHE-222.222.222", email: "gesperrt@example.ch", passwortHash: "x" });
  await kontoStatusSetzen(d, b.id, "gesperrt");
  const namen = await firmenNamen(d);
  assert.ok(namen.includes("Zeta Lift AG"), "auch ohne Freischaltung");
  assert.ok(!namen.includes("Gesperrt Lift GmbH"));
  assert.ok(!namen.includes("Verwaltung"));
  assert.ok(a.id > 0);
});

test("Checkliste vor Ort: speichern, abschliessen, Fotos (doppelt, gelöscht, höchstens 30)", { skip }, async () => {
  const id = await beratungAnlegen(d, {
    name: "Checkliste Kunde",
    email: "check@example.ch",
    telefon: "079 000 00 00",
    adresse: "Seestrasse 12, 8004 Zürich",
    anzahlAufzuege: 2,
    bemerkung: "",
    termin: { datum: "2026-12-02", zeit: "09:00" },
  });
  assert.equal((await beratungLaden(d, id))?.checkliste, null, "noch nicht angefangen");
  assert.equal(await checklisteLaden(d, id), null);

  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const klein = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9]);
  assert.equal(await fotoSpeichern(d, id, "f1", jpg, klein), "gespeichert");
  assert.equal(await fotoSpeichern(d, id, "f1", jpg, klein), "schon-da", "nach Unterbruch doppelt gesendet");
  assert.equal(await fotoSpeichern(d, id, "f2", jpg, klein), "gespeichert");

  const daten: ChecklisteDaten = leereCheckliste(2, "Checkliste Kunde");
  daten.aufzuege[0].antrieb = "seil";
  daten.fotos = [{ id: "f1", aufzug: "a1", stelle: "grube", notiz: "trocken" }];
  await checklisteSpeichern(d, id, daten);
  assert.deepEqual(await fotoIds(d, id), ["f1"], "f2 steht nicht mehr in der Liste und ist gelöscht");
  assert.deepEqual(await fotoLaden(d, id, "f1", false), jpg);
  assert.deepEqual(await fotoLaden(d, id, "f1", true), klein);
  assert.equal(await fotoLaden(d, id, "f2", true), null);
  assert.deepEqual([...(await vorschauBilder(d, id)).keys()], ["f1"]);

  let stand = await checklisteLaden(d, id);
  assert.equal(stand?.daten.fotos[0].notiz, "trocken");
  assert.equal(stand?.abgeschlossen_am, null);
  assert.equal((await beratungenListe(d)).find((b) => b.id === id)?.checkliste, "angefangen");

  daten.abschluss.abgeschlossenAm = "2026-12-02T09:45:00.000Z";
  await checklisteSpeichern(d, id, daten);
  stand = await checklisteLaden(d, id);
  const erstesMal = stand?.abgeschlossen_am;
  assert.ok(erstesMal instanceof Date);
  await checklisteSpeichern(d, id, daten);
  assert.deepEqual((await checklisteLaden(d, id))?.abgeschlossen_am, erstesMal, "Zeitpunkt bleibt beim erneuten Speichern");
  assert.equal((await beratungLaden(d, id))?.checkliste, "abgeschlossen");

  daten.abschluss.abgeschlossenAm = "";
  await checklisteSpeichern(d, id, daten);
  assert.equal((await checklisteLaden(d, id))?.abgeschlossen_am, null, "wieder bearbeiten");

  // Höchstens 30 Fotos pro Beratung
  for (let i = 0; i < FOTOS_MAX - 1; i++) assert.equal(await fotoSpeichern(d, id, `x${i}`, jpg, klein), "gespeichert");
  assert.equal(await fotoSpeichern(d, id, "zuviel", jpg, klein), "voll");
  assert.equal((await fotoIds(d, id)).length, FOTOS_MAX);
});

test("Vertragsunterlagen der Liftfirmen: höchstens 3, nur die eigenen löschen", { skip }, async () => {
  const a = await kontoAnlegen(d, { firma: "Unterlagen AG", uid: "CHE-111.222.333", email: "unterlagen-a@example.ch", passwortHash: "x" });
  const b = await kontoAnlegen(d, { firma: "Andere AG", uid: "CHE-444.555.666", email: "unterlagen-b@example.ch", passwortHash: "x" });
  const pdf = Buffer.from("%PDF-1.4 Testvertrag");

  assert.equal((await firmaLaden(d, a.id))?.firma, "Unterlagen AG");
  const admin = await kontoMitHashPerEmail(d, "chef@example.ch");
  if (admin) assert.equal(await firmaLaden(d, admin.id), null, "Verwaltung ist keine Liftfirma");

  for (let i = 0; i < UNTERLAGEN_MAX; i++) assert.equal(await unterlageSpeichern(d, a.id, `Vertrag ${i}.pdf`, pdf), "gespeichert");
  assert.equal(await unterlageSpeichern(d, a.id, "zuviel.pdf", pdf), "voll");
  const liste = await unterlagenListe(d, a.id);
  assert.deepEqual(liste.map((u) => u.dateiname), ["Vertrag 0.pdf", "Vertrag 1.pdf", "Vertrag 2.pdf"]);
  assert.equal(liste[0].groesse, pdf.length);

  const geladen = await unterlageLaden(d, liste[0].id);
  assert.equal(geladen?.konto_id, a.id);
  assert.ok(geladen?.inhalt.equals(pdf));

  // Eine andere Firma kann fremde Unterlagen nicht löschen.
  assert.equal(await unterlageLoeschen(d, b.id, liste[0].id), false);
  assert.equal(await unterlageLoeschen(d, a.id, liste[0].id), true);
  assert.equal((await unterlagenListe(d, a.id)).length, UNTERLAGEN_MAX - 1);
  assert.equal(await unterlageSpeichern(d, a.id, "neu.pdf", pdf), "gespeichert");
  assert.equal((await unterlagenListe(d, b.id)).length, 0);
});
