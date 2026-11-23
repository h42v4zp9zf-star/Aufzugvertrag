// Alle Datenbankabfragen an einem Ort.
import type { Db } from "./db.ts";
import { PIKETT_STANDARD, type Anlage, type Preismodell, type PreismodellDaten, type Stufe } from "./pricing.ts";
import type { DokumentTyp } from "./dokumente.ts";

export type Rolle = "firma" | "admin";
export type KontoStatus = "pruefung" | "aktiv" | "gesperrt";

export interface Konto {
  id: number;
  firma: string;
  uid: string;
  email: string;
  rolle: Rolle;
  status: KontoStatus;
  erstellt_am: Date;
}

export interface Anfrage {
  id: number;
  konto_id: number;
  firma: string;
  stufe: Stufe;
  preis_chf: number;
  anlage: Anlage;
  kunde_name: string;
  kunde_email: string;
  kunde_telefon: string;
  kunde_adresse: string;
  erstellt_am: Date;
}

const KONTO_FELDER = "id, firma, uid, email, rolle, status, erstellt_am";

// Neutrale Bewertung, bis es echte Kundenbewertungen gibt (wirkt für alle Firmen gleich).
const NEUTRALE_BEWERTUNG = 4;

export async function kontoAnlegen(
  d: Db,
  k: { firma: string; uid: string; email: string; passwortHash: string; rolle?: Rolle; status?: KontoStatus },
): Promise<Konto> {
  const { rows } = await d.query<Konto>(
    `INSERT INTO konten (firma, uid, email, passwort_hash, rolle, status)
     VALUES ($1, $2, lower($3), $4, $5, $6) RETURNING ${KONTO_FELDER}`,
    [k.firma, k.uid, k.email, k.passwortHash, k.rolle ?? "firma", k.status ?? "pruefung"],
  );
  return rows[0];
}

export async function kontoMitHashPerEmail(d: Db, email: string): Promise<(Konto & { passwort_hash: string }) | null> {
  const { rows } = await d.query<Konto & { passwort_hash: string }>(
    `SELECT ${KONTO_FELDER}, passwort_hash FROM konten WHERE email = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

export async function kontenListe(d: Db): Promise<Konto[]> {
  const { rows } = await d.query<Konto>(`SELECT ${KONTO_FELDER} FROM konten WHERE rolle = 'firma' ORDER BY erstellt_am DESC`);
  return rows;
}

/** Namen der registrierten Liftfirmen für die Hersteller-Liste (Wunsch Dario 23.11.2026:
 *  sofort nach der Registrierung, nicht erst nach Freischaltung; gesperrte nicht). */
export async function firmenNamen(d: Db): Promise<string[]> {
  const { rows } = await d.query<{ firma: string }>(
    `SELECT DISTINCT trim(firma) AS firma FROM konten
      WHERE rolle = 'firma' AND status <> 'gesperrt' AND trim(firma) <> ''
      ORDER BY 1`,
  );
  return rows.map((r) => r.firma.slice(0, 80));
}

export async function kontoStatusSetzen(d: Db, id: number, status: KontoStatus): Promise<void> {
  await d.query(`UPDATE konten SET status = $2 WHERE id = $1 AND rolle = 'firma'`, [id, status]);
}

export async function sitzungAnlegen(d: Db, tokenHash: string, kontoId: number, tage = 30): Promise<void> {
  await d.query(
    `INSERT INTO sitzungen (token_hash, konto_id, gueltig_bis) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [tokenHash, kontoId, tage],
  );
}

export async function kontoPerSitzung(d: Db, tokenHash: string): Promise<Konto | null> {
  const { rows } = await d.query<Konto>(
    `SELECT k.id, k.firma, k.uid, k.email, k.rolle, k.status, k.erstellt_am
       FROM sitzungen s JOIN konten k ON k.id = s.konto_id
      WHERE s.token_hash = $1 AND s.gueltig_bis > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function sitzungLoeschen(d: Db, tokenHash: string): Promise<void> {
  await d.query(`DELETE FROM sitzungen WHERE token_hash = $1`, [tokenHash]);
}

export async function preismodellSpeichern(d: Db, kontoId: number, daten: PreismodellDaten, veroeffentlicht: boolean): Promise<void> {
  await d.query(
    `INSERT INTO preismodelle (konto_id, daten, veroeffentlicht, geaendert_am) VALUES ($1, $2, $3, now())
     ON CONFLICT (konto_id) DO UPDATE SET daten = EXCLUDED.daten, veroeffentlicht = EXCLUDED.veroeffentlicht, geaendert_am = now()`,
    [kontoId, JSON.stringify(daten), veroeffentlicht],
  );
}

// Pakete, die vor der Pikett-Angabe gespeichert wurden, bekommen die bisherige Deckung.
function mitPikett(daten: PreismodellDaten): PreismodellDaten {
  return { ...daten, pakete: daten.pakete.map((p) => ({ ...p, pikett: p.pikett ?? PIKETT_STANDARD[p.stufe] })) };
}

export async function preismodellLaden(d: Db, kontoId: number): Promise<{ daten: PreismodellDaten; veroeffentlicht: boolean; geaendert_am: Date } | null> {
  const { rows } = await d.query<{ daten: PreismodellDaten; veroeffentlicht: boolean; geaendert_am: Date }>(
    `SELECT daten, veroeffentlicht, geaendert_am FROM preismodelle WHERE konto_id = $1`,
    [kontoId],
  );
  return rows[0] ? { ...rows[0], daten: mitPikett(rows[0].daten) } : null;
}

// Nur Preismodelle von freigeschalteten Firmen, die ihre Preise veröffentlicht haben.
export async function aktivePreismodelle(d: Db): Promise<Preismodell[]> {
  const { rows } = await d.query<{ id: number; firma: string; daten: PreismodellDaten }>(
    `SELECT k.id, k.firma, p.daten FROM preismodelle p JOIN konten k ON k.id = p.konto_id
      WHERE p.veroeffentlicht AND k.status = 'aktiv' AND k.rolle = 'firma'`,
  );
  return rows.map((r) => ({ ...mitPikett(r.daten), firma: r.firma, firmaId: r.id, bewertung: NEUTRALE_BEWERTUNG }));
}

export async function anfrageAnlegen(
  d: Db,
  a: { kontoId: number; stufe: Stufe; preisChf: number; anlage: Anlage; name: string; email: string; telefon: string; adresse: string },
): Promise<number> {
  const { rows } = await d.query<{ id: number }>(
    `INSERT INTO anfragen (konto_id, stufe, preis_chf, anlage, kunde_name, kunde_email, kunde_telefon, kunde_adresse)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [a.kontoId, a.stufe, a.preisChf, JSON.stringify(a.anlage), a.name, a.email, a.telefon, a.adresse],
  );
  return rows[0].id;
}

export interface Beratung {
  id: number;
  name: string;
  email: string;
  telefon: string;
  adresse: string;
  anzahl_aufzuege: number;
  bemerkung: string;
  /** „JJJJ-MM-TT“, bei älteren Buchungen ohne Termin null */
  termin_datum: string | null;
  /** „HH:MM“ */
  termin_zeit: string | null;
  erstellt_am: Date;
  /** Hochgeladene Dokumente, ohne Inhalt (der wird erst beim Herunterladen geladen). */
  dokumente: DokumentInfo[];
}

export interface DokumentInfo {
  id: number;
  dateiname: string;
  groesse: number;
}

export interface NeuesDokument {
  dateiname: string;
  typ: DokumentTyp;
  inhalt: Buffer;
}

/** Wird geworfen, wenn das Zeitfenster inzwischen von jemand anderem gebucht wurde. */
export class TerminVergeben extends Error {
  constructor() {
    super("Termin bereits vergeben");
  }
}

export async function beratungAnlegen(
  d: Db,
  b: {
    name: string;
    email: string;
    telefon: string;
    adresse: string;
    anzahlAufzuege: number;
    bemerkung: string;
    termin?: { datum: string; zeit: string };
    dokumente?: NeuesDokument[];
  },
): Promise<number> {
  const dok = b.dokumente ?? [];
  try {
    // Buchung und Dokumente in einer einzigen Anweisung: Ist der Termin schon vergeben,
    // wird auch kein Dokument gespeichert.
    const { rows } = await d.query<{ id: number }>(
      `WITH b AS (
         INSERT INTO beratungen (name, email, telefon, adresse, anzahl_aufzuege, bemerkung, termin_datum, termin_zeit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
       ), dok AS (
         INSERT INTO beratung_dokumente (beratung_id, dateiname, typ, groesse, inhalt)
         SELECT b.id, x.dateiname, x.typ, octet_length(x.inhalt), x.inhalt
           FROM b, unnest($9::text[], $10::text[], $11::bytea[]) AS x(dateiname, typ, inhalt)
       )
       SELECT id FROM b`,
      [
        b.name,
        b.email,
        b.telefon,
        b.adresse,
        b.anzahlAufzuege,
        b.bemerkung,
        b.termin?.datum ?? null,
        b.termin?.zeit ?? null,
        dok.map((x) => x.dateiname),
        dok.map((x) => x.typ),
        dok.map((x) => x.inhalt),
      ],
    );
    return rows[0].id;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new TerminVergeben();
    throw e;
  }
}

const BERATUNG_SPALTEN = `id, name, email, telefon, adresse, anzahl_aufzuege, bemerkung,
  to_char(termin_datum, 'YYYY-MM-DD') AS termin_datum, termin_zeit, erstellt_am,
  COALESCE((SELECT json_agg(json_build_object('id', x.id, 'dateiname', x.dateiname, 'groesse', x.groesse) ORDER BY x.id)
              FROM beratung_dokumente x WHERE x.beratung_id = beratungen.id), '[]'::json) AS dokumente`;

/** Neueste Termine zuerst; Buchungen ohne Termin (ältere) am Schluss. */
export async function beratungenListe(d: Db): Promise<Beratung[]> {
  const { rows } = await d.query<Beratung>(
    `SELECT ${BERATUNG_SPALTEN} FROM beratungen
      ORDER BY termin_datum DESC NULLS LAST, termin_zeit DESC, erstellt_am DESC`,
  );
  return rows;
}

/** Ein Dokument mit Inhalt, zum Herunterladen in der Verwaltung. */
export async function dokumentLaden(d: Db, id: number): Promise<(NeuesDokument & { id: number }) | null> {
  const { rows } = await d.query<NeuesDokument & { id: number }>(
    "SELECT id, dateiname, typ, inhalt FROM beratung_dokumente WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/** Belegte Zeitfenster zwischen zwei Daten (inklusive), als „JJJJ-MM-TT HH:MM“. */
export async function belegteTermine(d: Db, von: string, bis: string): Promise<string[]> {
  const { rows } = await d.query<{ schluessel: string }>(
    `SELECT to_char(termin_datum, 'YYYY-MM-DD') || ' ' || termin_zeit AS schluessel
       FROM beratungen WHERE termin_datum BETWEEN $1::date AND $2::date`,
    [von, bis],
  );
  return rows.map((r) => r.schluessel);
}

export async function anfragenListe(d: Db, kontoId?: number): Promise<Anfrage[]> {
  const { rows } = await d.query<Anfrage>(
    `SELECT a.*, k.firma FROM anfragen a JOIN konten k ON k.id = a.konto_id
      WHERE ($1::int IS NULL OR a.konto_id = $1) ORDER BY a.erstellt_am DESC`,
    [kontoId ?? null],
  );
  return rows;
}
