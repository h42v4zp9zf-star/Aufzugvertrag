"use server";

// Warteliste (Paket 2, Verbesserungen Nr. 8 und 23, 24.11.2026): Besucher hinterlassen ihre E-Mail-Adresse,
// wenn ihre PLZ ausserhalb des Kantons Zürich liegt oder es für ihre Anlage noch kein Angebot gibt.
import { headers } from "next/headers";
import { db, dbKonfiguriert } from "@/lib/db";
import { wartelisteEintragen, WARTELISTE_GRUENDE, type WartelisteGrund } from "@/lib/repo";
import { ipSchluessel, MELDUNG_ZU_VIELE, versuchMerken, zuViele } from "@/lib/schutz";
import { istSpam, MELDUNG_SPAM } from "@/lib/spamfalle";

export type WartelisteErgebnis = { ok: true } | { ok: false; fehler: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function aufWarteliste(e: { email: string; plz: string; grund: WartelisteGrund; webseite?: string }): Promise<WartelisteErgebnis> {
  if (!dbKonfiguriert()) return { ok: false, fehler: "In der Vorschau ist das noch nicht möglich." };
  if (istSpam(e.webseite)) return { ok: false, fehler: MELDUNG_SPAM };
  const email = String(e.email ?? "").trim().slice(0, 200);
  const plz = String(e.plz ?? "").trim();
  if (!EMAIL.test(email)) return { ok: false, fehler: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!/^\d{4}$/.test(plz)) return { ok: false, fehler: "Bitte eine gültige Postleitzahl angeben." };
  if (!Object.hasOwn(WARTELISTE_GRUENDE, String(e.grund))) return { ok: false, fehler: "Das hat nicht geklappt. Bitte laden Sie die Seite neu." };

  // Höchstens 10 Einträge pro Stunde vom selben Anschluss (wie die anderen Formulare, Verbesserung Nr. 32).
  const d = await db();
  const ip = ipSchluessel(await headers());
  if (await zuViele(d, "warteliste", ip)) return { ok: false, fehler: MELDUNG_ZU_VIELE };
  await versuchMerken(d, "warteliste", ip);
  await wartelisteEintragen(d, { email, plz, grund: e.grund });
  return { ok: true };
}
