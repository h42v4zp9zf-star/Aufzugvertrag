"use server";

import { db, dbKonfiguriert } from "@/lib/db";
import { beratungAnlegen } from "@/lib/repo";

export type BeratungErgebnis = { ok: true } | { ok: false; fehler: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (f: FormData, n: string, max: number) => String(f.get(n) ?? "").trim().slice(0, max);

export async function beratungSenden(f: FormData): Promise<BeratungErgebnis> {
  if (!dbKonfiguriert()) return { ok: false, fehler: "Buchungen sind in der Vorschau noch nicht möglich." };
  const name = text(f, "name", 200);
  const email = text(f, "email", 200);
  const telefon = text(f, "telefon", 50);
  const adresse = text(f, "adresse", 300);
  const bemerkung = text(f, "bemerkung", 2000);
  const anzahl = Number(text(f, "anzahl", 5) || "1");
  if (!name) return { ok: false, fehler: "Bitte Ihren Namen angeben." };
  if (!EMAIL.test(email)) return { ok: false, fehler: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!telefon) return { ok: false, fehler: "Bitte eine Telefonnummer angeben, damit wir den Termin abmachen können." };
  if (!adresse) return { ok: false, fehler: "Bitte die Adresse der Liegenschaft angeben." };
  if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 50) return { ok: false, fehler: "Anzahl Aufzüge: bitte eine Zahl zwischen 1 und 50." };
  if (f.get("pauschale") !== "on") return { ok: false, fehler: "Bitte bestätigen Sie die Anfangspauschale von CHF 130." };

  await beratungAnlegen(await db(), { name, email, telefon, adresse, anzahlAufzuege: anzahl, bemerkung });
  return { ok: true };
}
