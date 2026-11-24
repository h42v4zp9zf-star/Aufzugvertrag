// Alle Datenbankabfragen an einem Ort.
import type { Db } from "./db.ts";
import { PIKETT_STANDARD, type Anlage, type Preismodell, type PreismodellDaten, type Stufe } from "./pricing.ts";
import type { DokumentTyp } from "./dokumente.ts";
import { FOTOS_MAX, type ChecklisteDaten } from "./checkliste.ts";

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
  /** Firma oder Verwaltung (freiwillig, seit 24.11.2026). */
  kunde_firma: string;
  /** Leer = wie die Adresse der Liegenschaft. */
  rechnungsadresse: string;
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

/** Ein Konto einer Liftfirma (nicht die Verwaltung), z. B. für die Detailseite in der Verwaltung. */
export async function firmaLaden(d: Db, id: number): Promise<Konto | null> {
  const { rows } = await d.query<Konto>(`SELECT ${KONTO_FELDER} FROM konten WHERE id = $1 AND rolle = 'firma'`, [id]);
  return rows[0] ?? null;
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

/** Neuer Link zum Zurücksetzen des Passworts; ältere Links dieses Kontos werden ungültig. */
export async function passwortLinkAnlegen(d: Db, kontoId: number, tokenHash: string, minuten: number): Promise<void> {
  await d.query(`DELETE FROM passwort_links WHERE konto_id = $1`, [kontoId]);
  await d.query(
    `INSERT INTO passwort_links (token_hash, konto_id, gueltig_bis) VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [tokenHash, kontoId, minuten],
  );
}

/** Wurde für dieses Konto in den letzten `minuten` schon ein Link erstellt? (gegen viele Mails) */
export async function passwortLinkKuerzlich(d: Db, kontoId: number, minuten: number): Promise<boolean> {
  const { rows } = await d.query(
    `SELECT 1 FROM passwort_links WHERE konto_id = $1 AND erstellt_am > now() - make_interval(mins => $2)`,
    [kontoId, minuten],
  );
  return rows.length > 0;
}

/** Konto zu einem gültigen Link, sonst null (abgelaufen, schon benutzt oder unbekannt). */
export async function kontoPerPasswortLink(d: Db, tokenHash: string): Promise<Konto | null> {
  const { rows } = await d.query<Konto>(
    `SELECT k.id, k.firma, k.uid, k.email, k.rolle, k.status, k.erstellt_am
       FROM passwort_links l JOIN konten k ON k.id = l.konto_id
      WHERE l.token_hash = $1 AND l.gueltig_bis > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

/**
 * Setzt das neue Passwort, wenn der Link gültig ist, und löst ihn dabei ein (nur einmal).
 * Alle Anmeldungen des Kontos werden beendet. Gibt das Konto zurück, sonst null.
 */
export async function passwortZuruecksetzen(d: Db, tokenHash: string, passwortHash: string): Promise<Konto | null> {
  const { rows } = await d.query<Konto>(
    `WITH link AS (
       DELETE FROM passwort_links WHERE token_hash = $1 AND gueltig_bis > now() RETURNING konto_id
     )
     UPDATE konten k SET passwort_hash = $2 FROM link WHERE k.id = link.konto_id
     RETURNING k.id, k.firma, k.uid, k.email, k.rolle, k.status, k.erstellt_am`,
    [tokenHash, passwortHash],
  );
  const konto = rows[0] ?? null;
  if (konto) {
    await d.query(`DELETE FROM sitzungen WHERE konto_id = $1`, [konto.id]);
    await d.query(`DELETE FROM passwort_links WHERE konto_id = $1`, [konto.id]);
  }
  return konto;
}

export async function preismodellSpeichern(d: Db, kontoId: number, daten: PreismodellDaten, veroeffentlicht: boolean): Promise<void> {
  await d.query(
    `INSERT INTO preismodelle (konto_id, daten, veroeffentlicht, geaendert_am) VALUES ($1, $2, $3, now())
     ON CONFLICT (konto_id) DO UPDATE SET daten = EXCLUDED.daten, veroeffentlicht = EXCLUDED.veroeffentlicht, geaendert_am = now()`,
    [kontoId, JSON.stringify(daten), veroeffentlicht],
  );
}

// Pakete, die vor der Pikett-Angabe gespeichert wurden, bekommen die bisherige Deckung.
// Preismodelle von vor dem Zuschlag Sicherheitsdispositiv bekommen dort 0 Franken.
function mitPikett(daten: PreismodellDaten): PreismodellDaten {
  return {
    ...daten,
    pakete: daten.pakete.map((p) => ({ ...p, pikett: p.pikett ?? PIKETT_STANDARD[p.stufe] })),
    zuschlaege: { ...daten.zuschlaege, sicherheitsdispositivChf: daten.zuschlaege.sicherheitsdispositivChf ?? 0 },
  };
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
  a: {
    kontoId: number;
    stufe: Stufe;
    preisChf: number;
    anlage: Anlage;
    name: string;
    email: string;
    telefon: string;
    adresse: string;
    firma?: string;
    rechnungsadresse?: string;
  },
): Promise<number> {
  const { rows } = await d.query<{ id: number }>(
    `INSERT INTO anfragen (konto_id, stufe, preis_chf, anlage, kunde_name, kunde_email, kunde_telefon, kunde_adresse, kunde_firma, rechnungsadresse)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [a.kontoId, a.stufe, a.preisChf, JSON.stringify(a.anlage), a.name, a.email, a.telefon, a.adresse, a.firma ?? "", a.rechnungsadresse ?? ""],
  );
  return rows[0].id;
}

export interface Beratung {
  id: number;
  name: string;
  email: string;
  telefon: string;
  adresse: string;
  /** PLZ der Liegenschaft (seit 24.11.2026, bei älteren Buchungen leer). */
  plz: string;
  /** Firma oder Verwaltung (freiwillig). */
  firma: string;
  /** Leer = wie die Adresse der Liegenschaft. */
  rechnungsadresse: string;
  anzahl_aufzuege: number;
  bemerkung: string;
  /** „JJJJ-MM-TT“, bei älteren Buchungen ohne Termin null */
  termin_datum: string | null;
  /** „HH:MM“ */
  termin_zeit: string | null;
  erstellt_am: Date;
  /** Hochgeladene Dokumente, ohne Inhalt (der wird erst beim Herunterladen geladen). */
  dokumente: DokumentInfo[];
  /** Stand der Checkliste vor Ort: null = noch nicht angefangen. */
  checkliste: "angefangen" | "abgeschlossen" | null;
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
    plz?: string;
    firma?: string;
    rechnungsadresse?: string;
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
         INSERT INTO beratungen (name, email, telefon, adresse, anzahl_aufzuege, bemerkung, termin_datum, termin_zeit, plz, firma, rechnungsadresse)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $12, $13, $14) RETURNING id
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
        b.plz ?? "",
        b.firma ?? "",
        b.rechnungsadresse ?? "",
      ],
    );
    return rows[0].id;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new TerminVergeben();
    throw e;
  }
}

const BERATUNG_SPALTEN = `id, name, email, telefon, adresse, plz, firma, rechnungsadresse, anzahl_aufzuege, bemerkung,
  to_char(termin_datum, 'YYYY-MM-DD') AS termin_datum, termin_zeit, erstellt_am,
  COALESCE((SELECT json_agg(json_build_object('id', x.id, 'dateiname', x.dateiname, 'groesse', x.groesse) ORDER BY x.id)
              FROM beratung_dokumente x WHERE x.beratung_id = beratungen.id), '[]'::json) AS dokumente,
  (SELECT CASE WHEN c.abgeschlossen_am IS NULL THEN 'angefangen' ELSE 'abgeschlossen' END
     FROM beratung_checklisten c WHERE c.beratung_id = beratungen.id) AS checkliste`;

/** Neueste Termine zuerst; Buchungen ohne Termin (ältere) am Schluss. */
export async function beratungenListe(d: Db): Promise<Beratung[]> {
  const { rows } = await d.query<Beratung>(
    `SELECT ${BERATUNG_SPALTEN} FROM beratungen
      ORDER BY termin_datum DESC NULLS LAST, termin_zeit DESC, erstellt_am DESC`,
  );
  return rows;
}

export async function beratungLaden(d: Db, id: number): Promise<Beratung | null> {
  const { rows } = await d.query<Beratung>(`SELECT ${BERATUNG_SPALTEN} FROM beratungen WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// ---- Checkliste vor Ort ----------------------------------------------------

export interface ChecklisteStand {
  daten: ChecklisteDaten;
  abgeschlossen_am: Date | null;
  geaendert_am: Date;
}

export async function checklisteLaden(d: Db, beratungId: number): Promise<ChecklisteStand | null> {
  const { rows } = await d.query<ChecklisteStand>(
    "SELECT daten, abgeschlossen_am, geaendert_am FROM beratung_checklisten WHERE beratung_id = $1",
    [beratungId],
  );
  return rows[0] ?? null;
}

/**
 * Speichert die (bereinigte) Checkliste. Fotos, die nicht mehr in der Liste stehen,
 * werden in derselben Anweisung gelöscht.
 */
export async function checklisteSpeichern(d: Db, beratungId: number, daten: ChecklisteDaten): Promise<Date> {
  const { rows } = await d.query<{ geaendert_am: Date }>(
    `WITH s AS (
       INSERT INTO beratung_checklisten (beratung_id, daten, abgeschlossen_am)
       VALUES ($1, $2, CASE WHEN $3::boolean THEN now() END)
       ON CONFLICT (beratung_id) DO UPDATE SET
         daten = EXCLUDED.daten,
         abgeschlossen_am = CASE WHEN $3::boolean THEN COALESCE(beratung_checklisten.abgeschlossen_am, now()) END,
         geaendert_am = now()
       RETURNING geaendert_am
     ), weg AS (
       DELETE FROM beratung_fotos WHERE beratung_id = $1 AND NOT (foto_id = ANY($4::text[]))
     )
     SELECT geaendert_am FROM s`,
    [beratungId, JSON.stringify(daten), daten.abschluss.abgeschlossenAm !== "", daten.fotos.map((f) => f.id)],
  );
  return rows[0].geaendert_am;
}

/** Kennungen der Fotos, die schon auf dem Server liegen. */
export async function fotoIds(d: Db, beratungId: number): Promise<string[]> {
  const { rows } = await d.query<{ foto_id: string }>(
    "SELECT foto_id FROM beratung_fotos WHERE beratung_id = $1 ORDER BY id",
    [beratungId],
  );
  return rows.map((r) => r.foto_id);
}

/**
 * Speichert ein Foto (gross und verkleinert). Kommt dasselbe Foto zweimal an (z. B. nach einem
 * Unterbruch), bleibt das erste. „voll“, wenn schon {@link FOTOS_MAX} Fotos gespeichert sind.
 */
export async function fotoSpeichern(
  d: Db,
  beratungId: number,
  fotoId: string,
  inhalt: Buffer,
  vorschau: Buffer,
): Promise<"gespeichert" | "schon-da" | "voll"> {
  const { rows } = await d.query<{ id: number }>(
    `INSERT INTO beratung_fotos (beratung_id, foto_id, inhalt, vorschau)
     SELECT $1, $2, $3, $4
      WHERE (SELECT count(*) FROM beratung_fotos WHERE beratung_id = $1) < $5
     ON CONFLICT (beratung_id, foto_id) DO NOTHING
     RETURNING id`,
    [beratungId, fotoId, inhalt, vorschau, FOTOS_MAX],
  );
  if (rows.length > 0) return "gespeichert";
  const da = await d.query("SELECT 1 FROM beratung_fotos WHERE beratung_id = $1 AND foto_id = $2", [beratungId, fotoId]);
  return da.rows.length > 0 ? "schon-da" : "voll";
}

export async function fotoLaden(d: Db, beratungId: number, fotoId: string, klein: boolean): Promise<Buffer | null> {
  const { rows } = await d.query<{ bild: Buffer }>(
    `SELECT ${klein ? "vorschau" : "inhalt"} AS bild FROM beratung_fotos WHERE beratung_id = $1 AND foto_id = $2`,
    [beratungId, fotoId],
  );
  return rows[0]?.bild ?? null;
}

/** Alle verkleinerten Fotos einer Beratung, für den Bericht. */
export async function vorschauBilder(d: Db, beratungId: number): Promise<Map<string, Buffer>> {
  const { rows } = await d.query<{ foto_id: string; vorschau: Buffer }>(
    "SELECT foto_id, vorschau FROM beratung_fotos WHERE beratung_id = $1",
    [beratungId],
  );
  return new Map(rows.map((r) => [r.foto_id, r.vorschau]));
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

// Vertragsunterlagen der Liftfirmen (Wunsch Dario 23.11.2026): freiwillig, nur PDF.
export const UNTERLAGEN_MAX = 3;

export interface Unterlage {
  id: number;
  dateiname: string;
  groesse: number;
  erstellt_am: Date;
}

export async function unterlagenListe(d: Db, kontoId: number): Promise<Unterlage[]> {
  const { rows } = await d.query<Unterlage>(
    "SELECT id, dateiname, groesse, erstellt_am FROM firmen_dokumente WHERE konto_id = $1 ORDER BY erstellt_am, id",
    [kontoId],
  );
  return rows;
}

/** Speichert eine Unterlage. „voll“, wenn die Firma schon {@link UNTERLAGEN_MAX} Unterlagen hat. */
export async function unterlageSpeichern(d: Db, kontoId: number, dateiname: string, inhalt: Buffer): Promise<"gespeichert" | "voll"> {
  const { rows } = await d.query<{ id: number }>(
    `INSERT INTO firmen_dokumente (konto_id, dateiname, groesse, inhalt)
     SELECT $1, $2, $3, $4
      WHERE (SELECT count(*) FROM firmen_dokumente WHERE konto_id = $1) < $5
     RETURNING id`,
    [kontoId, dateiname, inhalt.length, inhalt, UNTERLAGEN_MAX],
  );
  return rows.length > 0 ? "gespeichert" : "voll";
}

export async function unterlageLaden(d: Db, id: number): Promise<{ konto_id: number; dateiname: string; inhalt: Buffer } | null> {
  const { rows } = await d.query<{ konto_id: number; dateiname: string; inhalt: Buffer }>(
    "SELECT konto_id, dateiname, inhalt FROM firmen_dokumente WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/** Löscht eine Unterlage, aber nur, wenn sie zu dieser Firma gehört. */
export async function unterlageLoeschen(d: Db, kontoId: number, id: number): Promise<boolean> {
  const { rows } = await d.query<{ id: number }>("DELETE FROM firmen_dokumente WHERE id = $1 AND konto_id = $2 RETURNING id", [id, kontoId]);
  return rows.length > 0;
}

// Warteliste (Paket 2, Verbesserungen Nr. 8 und 23, 24.11.2026).
export type WartelisteGrund = "ausserhalb" | "kein_angebot" | "beratung_ausserhalb";
export const WARTELISTE_GRUENDE: Record<WartelisteGrund, string> = {
  ausserhalb: "Ausserhalb des Kantons Zürich",
  kein_angebot: "Noch kein Angebot in der Region",
  beratung_ausserhalb: "Beratung ausserhalb des Kantons Zürich",
};

export interface WartelisteEintrag {
  id: number;
  email: string;
  plz: string;
  grund: WartelisteGrund;
  erstellt_am: Date;
}

/** Speichert die Adresse; ist sie für diese PLZ und diesen Grund schon da, passiert nichts. */
export async function wartelisteEintragen(d: Db, e: { email: string; plz: string; grund: WartelisteGrund }): Promise<void> {
  await d.query("INSERT INTO warteliste (email, plz, grund) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [e.email, e.plz, e.grund]);
}

export async function wartelisteLaden(d: Db): Promise<WartelisteEintrag[]> {
  const { rows } = await d.query<WartelisteEintrag>("SELECT id, email, plz, grund, erstellt_am FROM warteliste ORDER BY erstellt_am DESC, id DESC");
  return rows;
}
