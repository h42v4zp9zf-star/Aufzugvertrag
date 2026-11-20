// Datenbankzugriff (PostgreSQL). Verbindung über die Umgebungsvariable DATABASE_URL.
import pg from "pg";

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
`;

let pool: pg.Pool | null = null;
let bereit: Promise<void> | null = null;

export function dbKonfiguriert(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Liefert die Datenbank und legt beim ersten Zugriff die Tabellen an.
export async function db(): Promise<Db> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    bereit = pool.query(SCHEMA).then(() => undefined);
  }
  await bereit;
  return pool as unknown as Db;
}

export async function dbSchliessen(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
  bereit = null;
}
