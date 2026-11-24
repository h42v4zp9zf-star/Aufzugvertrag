// Schutz vor Spam und Passwort-Raten (Verbesserung Nr. 32, Entscheid Dario 24.11.2026):
// höchstens so viele Versuche pro E-Mail-Adresse oder Anschluss (IP-Adresse) in einer Zeitspanne.
// Gespeichert wird nur eine Prüfsumme, nie die Adresse selbst, und nach einem Tag wird alles gelöscht.
import { createHash } from "node:crypto";
import type { Db } from "./db.ts";

export type VersuchArt = "login-email" | "login-ip" | "registrierung" | "beratung" | "anfrage" | "passwort";

/** Grenzen pro Art: höchstens `max` Versuche in `minuten`. */
export const GRENZEN: Record<VersuchArt, { max: number; minuten: number }> = {
  "login-email": { max: 10, minuten: 15 }, // falsche Passwörter für dieselbe E-Mail-Adresse
  "login-ip": { max: 30, minuten: 15 }, // falsche Passwörter vom selben Anschluss
  registrierung: { max: 5, minuten: 60 },
  beratung: { max: 5, minuten: 60 },
  anfrage: { max: 10, minuten: 60 },
  passwort: { max: 10, minuten: 60 },
};

export const MELDUNG_LOGIN_GESPERRT = "Zu viele falsche Versuche. Bitte warten Sie 15 Minuten und versuchen Sie es dann noch einmal.";
export const MELDUNG_ZU_VIELE = "Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einer Stunde noch einmal.";

/** Prüfsumme statt Klartext (z. B. für E-Mail-Adressen). */
export function schluessel(wert: string): string {
  return createHash("sha256").update(`elevaris:${wert.trim().toLowerCase()}`).digest("hex").slice(0, 32);
}

/** Anschluss des Besuchers als Prüfsumme: erste IP-Adresse aus x-forwarded-for (setzt Vercel). */
export function ipSchluessel(h: Pick<Headers, "get">): string {
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unbekannt";
  return schluessel(`ip:${ip}`);
}

/** true, wenn die Grenze für diese Art und diesen Schlüssel erreicht ist. */
export async function zuViele(d: Db, art: VersuchArt, key: string): Promise<boolean> {
  const { max, minuten } = GRENZEN[art];
  const { rows } = await d.query<{ n: string }>(
    "SELECT count(*) AS n FROM versuche WHERE art = $1 AND schluessel = $2 AND zeit > now() - make_interval(mins => $3)",
    [art, key, minuten],
  );
  return Number(rows[0]?.n ?? 0) >= max;
}

/** Einen Versuch zählen und dabei Einträge löschen, die älter als ein Tag sind. */
export async function versuchMerken(d: Db, art: VersuchArt, key: string): Promise<void> {
  await d.query("INSERT INTO versuche (art, schluessel) VALUES ($1, $2)", [art, key]);
  await d.query("DELETE FROM versuche WHERE zeit < now() - interval '1 day'");
}

/** Gezählte Versuche löschen, z. B. nach einer erfolgreichen Anmeldung. */
export async function versucheLoeschen(d: Db, art: VersuchArt, key: string): Promise<void> {
  await d.query("DELETE FROM versuche WHERE art = $1 AND schluessel = $2", [art, key]);
}
