// Alle Datenbankabfragen an einem Ort.
import type { Db } from "./db.ts";
import type { Anlage, Preismodell, PreismodellDaten, Stufe } from "./pricing.ts";

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

export async function preismodellLaden(d: Db, kontoId: number): Promise<{ daten: PreismodellDaten; veroeffentlicht: boolean; geaendert_am: Date } | null> {
  const { rows } = await d.query<{ daten: PreismodellDaten; veroeffentlicht: boolean; geaendert_am: Date }>(
    `SELECT daten, veroeffentlicht, geaendert_am FROM preismodelle WHERE konto_id = $1`,
    [kontoId],
  );
  return rows[0] ?? null;
}

// Nur Preismodelle von freigeschalteten Firmen, die ihre Preise veröffentlicht haben.
export async function aktivePreismodelle(d: Db): Promise<Preismodell[]> {
  const { rows } = await d.query<{ id: number; firma: string; daten: PreismodellDaten }>(
    `SELECT k.id, k.firma, p.daten FROM preismodelle p JOIN konten k ON k.id = p.konto_id
      WHERE p.veroeffentlicht AND k.status = 'aktiv' AND k.rolle = 'firma'`,
  );
  return rows.map((r) => ({ ...r.daten, firma: r.firma, firmaId: r.id, bewertung: NEUTRALE_BEWERTUNG }));
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
  erstellt_am: Date;
}

export async function beratungAnlegen(
  d: Db,
  b: { name: string; email: string; telefon: string; adresse: string; anzahlAufzuege: number; bemerkung: string },
): Promise<number> {
  const { rows } = await d.query<{ id: number }>(
    `INSERT INTO beratungen (name, email, telefon, adresse, anzahl_aufzuege, bemerkung)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [b.name, b.email, b.telefon, b.adresse, b.anzahlAufzuege, b.bemerkung],
  );
  return rows[0].id;
}

export async function beratungenListe(d: Db): Promise<Beratung[]> {
  const { rows } = await d.query<Beratung>("SELECT * FROM beratungen ORDER BY erstellt_am DESC");
  return rows;
}

export async function anfragenListe(d: Db, kontoId?: number): Promise<Anfrage[]> {
  const { rows } = await d.query<Anfrage>(
    `SELECT a.*, k.firma FROM anfragen a JOIN konten k ON k.id = a.konto_id
      WHERE ($1::int IS NULL OR a.konto_id = $1) ORDER BY a.erstellt_am DESC`,
    [kontoId ?? null],
  );
  return rows;
}
