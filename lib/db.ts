// Datenbankzugriff (PostgreSQL). Verbindung über die Umgebungsvariable DATABASE_URL
// (oder POSTGRES_URL, wie sie manche Hoster automatisch setzen).
import pg from "pg";
import { emailFehler, hashPasswort, passwortFehler, pruefePasswort } from "./passwort.ts";

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS konten (
  id            SERIAL PRIMARY KEY,
  firma         TEXT NOT NULL,
  uid           TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL UNIQUE,
  passwort_hash TEXT NOT NULL,
  rolle         TEXT NOT NULL DEFAULT 'firma' CHECK (rolle IN ('firma', 'admin')),
  status        TEXT NOT NULL DEFAULT 'pruefung' CHECK (status IN ('pruefung', 'aktiv', 'gesperrt')),
  erstellt_am   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sitzungen (
  token_hash  TEXT PRIMARY KEY,
  konto_id    INTEGER NOT NULL REFERENCES konten(id) ON DELETE CASCADE,
  gueltig_bis TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS preismodelle (
  konto_id         INTEGER PRIMARY KEY REFERENCES konten(id) ON DELETE CASCADE,
  daten            JSONB NOT NULL,
  veroeffentlicht  BOOLEAN NOT NULL DEFAULT false,
  geaendert_am     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anfragen (
  id             SERIAL PRIMARY KEY,
  konto_id       INTEGER NOT NULL REFERENCES konten(id) ON DELETE CASCADE,
  stufe          TEXT NOT NULL,
  preis_chf      INTEGER NOT NULL,
  anlage         JSONB NOT NULL,
  kunde_name     TEXT NOT NULL,
  kunde_email    TEXT NOT NULL,
  kunde_telefon  TEXT NOT NULL DEFAULT '',
  kunde_adresse  TEXT NOT NULL DEFAULT '',
  erstellt_am    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS beratungen (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  telefon          TEXT NOT NULL,
  adresse          TEXT NOT NULL,
  anzahl_aufzuege  INTEGER NOT NULL DEFAULT 1,
  bemerkung        TEXT NOT NULL DEFAULT '',
  erstellt_am      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Fester Termin (seit 23.11.2026). Ältere Buchungen haben keinen.
ALTER TABLE beratungen ADD COLUMN IF NOT EXISTS termin_datum DATE;
ALTER TABLE beratungen ADD COLUMN IF NOT EXISTS termin_zeit TEXT;
-- Pro Zeitfenster nur eine Buchung, auch wenn zwei Kunden gleichzeitig klicken.
CREATE UNIQUE INDEX IF NOT EXISTS beratungen_termin_eindeutig
  ON beratungen (termin_datum, termin_zeit) WHERE termin_datum IS NOT NULL;

-- Freiwillige Dokumente zur Beratung (seit 23.11.2026), z. B. bisheriger Wartungsvertrag.
CREATE TABLE IF NOT EXISTS beratung_dokumente (
  id           SERIAL PRIMARY KEY,
  beratung_id  INTEGER NOT NULL REFERENCES beratungen(id) ON DELETE CASCADE,
  dateiname    TEXT NOT NULL,
  typ          TEXT NOT NULL,
  groesse      INTEGER NOT NULL,
  inhalt       BYTEA NOT NULL,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beratung_dokumente_beratung ON beratung_dokumente (beratung_id);

-- Checkliste vor Ort (Wunsch Dario, 23.11.2026): alle Angaben als JSON, Fotos separat.
-- Vertragsunterlagen der Liftfirmen (Wunsch Dario 23.11.2026): freiwillig, nur PDF,
-- höchstens 3 pro Firma. Sehen kann sie nur die Firma selbst und die Verwaltung.
CREATE TABLE IF NOT EXISTS firmen_dokumente (
  id           SERIAL PRIMARY KEY,
  konto_id     INTEGER NOT NULL REFERENCES konten(id) ON DELETE CASCADE,
  dateiname    TEXT NOT NULL,
  groesse      INTEGER NOT NULL,
  inhalt       BYTEA NOT NULL,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS firmen_dokumente_konto ON firmen_dokumente (konto_id);

-- „Passwort vergessen“ (Entscheid Dario 24.11.2026): Link per E-Mail (1 Stunde) oder von der
-- Verwaltung erstellt (24 Stunden). Nur der Hash des Tokens liegt hier, jeder Link gilt einmal.
CREATE TABLE IF NOT EXISTS passwort_links (
  token_hash   TEXT PRIMARY KEY,
  konto_id     INTEGER NOT NULL REFERENCES konten(id) ON DELETE CASCADE,
  gueltig_bis  TIMESTAMPTZ NOT NULL,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS passwort_links_konto ON passwort_links (konto_id);

-- Schutz vor Spam und Passwort-Raten (Verbesserung Nr. 32, 24.11.2026): Versuche pro Art und Schlüssel
-- (E-Mail-Adresse oder verschlüsselte IP-Adresse), älter als ein Tag wird gelöscht.
CREATE TABLE IF NOT EXISTS versuche (
  art         TEXT NOT NULL,
  schluessel  TEXT NOT NULL,
  zeit        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS versuche_suche ON versuche (art, schluessel, zeit);

CREATE TABLE IF NOT EXISTS beratung_checklisten (
  beratung_id       INTEGER PRIMARY KEY REFERENCES beratungen(id) ON DELETE CASCADE,
  daten             JSONB NOT NULL,
  abgeschlossen_am  TIMESTAMPTZ,
  geaendert_am      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS beratung_fotos (
  id           SERIAL PRIMARY KEY,
  beratung_id  INTEGER NOT NULL REFERENCES beratungen(id) ON DELETE CASCADE,
  foto_id      TEXT NOT NULL,
  inhalt       BYTEA NOT NULL,
  vorschau     BYTEA NOT NULL,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (beratung_id, foto_id)
);

-- Rechnungsangaben (Paket 2, Verbesserung Nr. 3, 24.11.2026): Firma oder Verwaltung (freiwillig)
-- und Rechnungsadresse (leer = wie die Adresse der Liegenschaft). Bei der Beratung auch die PLZ.
ALTER TABLE anfragen ADD COLUMN IF NOT EXISTS kunde_firma TEXT NOT NULL DEFAULT '';
ALTER TABLE anfragen ADD COLUMN IF NOT EXISTS rechnungsadresse TEXT NOT NULL DEFAULT '';
ALTER TABLE beratungen ADD COLUMN IF NOT EXISTS plz TEXT NOT NULL DEFAULT '';
ALTER TABLE beratungen ADD COLUMN IF NOT EXISTS firma TEXT NOT NULL DEFAULT '';
ALTER TABLE beratungen ADD COLUMN IF NOT EXISTS rechnungsadresse TEXT NOT NULL DEFAULT '';

-- Warteliste (Paket 2, Verbesserungen Nr. 8 und 23): E-Mail-Adressen von Besuchern ausserhalb des
-- Kantons Zürich oder ohne Angebot in ihrer Region. Dieselbe Adresse wird pro PLZ und Grund nur einmal gespeichert.
CREATE TABLE IF NOT EXISTS warteliste (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  plz          TEXT NOT NULL,
  grund        TEXT NOT NULL,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS warteliste_eindeutig ON warteliste (lower(email), plz, grund);
`;

let pool: pg.Pool | null = null;
let bereit: Promise<void> | null = null;

function datenbankUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

export function dbKonfiguriert(): boolean {
  return Boolean(datenbankUrl());
}

// Verwaltungskonto aus den Umgebungsvariablen ADMIN_EMAIL und ADMIN_PASSWORT.
// So lässt sich das Konto beim Hoster einrichten, ganz ohne Kommandozeile.
// Ändert man ADMIN_PASSWORT, gilt nach dem nächsten Start das neue Passwort.
export async function adminAusUmgebung(d: Db, env: Record<string, string | undefined> = process.env): Promise<void> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwort = env.ADMIN_PASSWORT ?? "";
  if (!email) return;
  const emailProblem = emailFehler(email);
  if (emailProblem) {
    console.warn(`ADMIN_EMAIL ungültig, Verwaltungskonto nicht eingerichtet: ${emailProblem}`);
    return;
  }
  const fehler = passwortFehler(passwort);
  if (fehler) {
    console.warn(`ADMIN_PASSWORT ungültig, Verwaltungskonto nicht eingerichtet: ${fehler}`);
    return;
  }
  const { rows } = await d.query<{ id: number; rolle: string; passwort_hash: string }>(
    "SELECT id, rolle, passwort_hash FROM konten WHERE email = $1",
    [email],
  );
  if (rows.length === 0) {
    await d.query(
      `INSERT INTO konten (firma, uid, email, passwort_hash, rolle, status)
       VALUES ('Verwaltung', '', $1, $2, 'admin', 'aktiv') ON CONFLICT (email) DO NOTHING`,
      [email, await hashPasswort(passwort)],
    );
  } else if (rows[0].rolle === "admin" && !(await pruefePasswort(passwort, rows[0].passwort_hash))) {
    await d.query("UPDATE konten SET passwort_hash = $1, status = 'aktiv' WHERE id = $2", [await hashPasswort(passwort), rows[0].id]);
  }
}

// Liefert die Datenbank und legt beim ersten Zugriff die Tabellen an.
export async function db(): Promise<Db> {
  const url = datenbankUrl();
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }
  if (!pool) {
    const p = new pg.Pool({ connectionString: url, max: 5 });
    pool = p;
    bereit = p
      .query(SCHEMA)
      .then(() => adminAusUmgebung(p as unknown as Db))
      .catch((e) => {
        // Beim nächsten Aufruf neu versuchen statt dauerhaft zu scheitern.
        pool = null;
        bereit = null;
        void p.end().catch(() => undefined);
        throw e;
      });
  }
  await bereit;
  return pool as unknown as Db;
}

export async function dbSchliessen(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
  bereit = null;
}
