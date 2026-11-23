"use server";

import { BERATUNG_PREIS_CHF } from "@/lib/config";
import { db, dbKonfiguriert } from "@/lib/db";
import { beratungAnlegen, TerminVergeben } from "@/lib/repo";
import { heuteInZuerich, terminGueltig } from "@/lib/termine";

export type BeratungErgebnis = { ok: true } | { ok: false; fehler: string; vergeben?: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (f: FormData, n: string, max: number) => String(f.get(n) ?? "").trim().slice(0, max);

export async function beratungSenden(f: FormData): Promise<BeratungErgebnis> {
  if (!dbKonfiguriert()) return { ok: false, fehler: "Buchungen sind in der Vorschau noch nicht möglich." };
  const datum = text(f, "termin_datum", 10);
  const zeit = text(f, "termin_zeit", 5);
  const name = text(f, "name", 200);
  const email = text(f, "email", 200);
  const telefon = text(f, "telefon", 50);
  const adresse = text(f, "adresse", 300);
  const bemerkung = text(f, "bemerkung", 2000);
  const anzahl = Number(text(f, "anzahl", 5) || "1");
  if (!terminGueltig(datum, zeit, heuteInZuerich()))
    return { ok: false, fehler: "Bitte wählen Sie einen freien Termin (Montag bis Freitag, 7 bis 17 Uhr, ab morgen)." };
  if (!name) return { ok: false, fehler: "Bitte Ihren Namen angeben." };
  if (!EMAIL.test(email)) return { ok: false, fehler: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!telefon) return { ok: false, fehler: "Bitte eine Telefonnummer angeben, damit wir Sie erreichen können." };
  if (!adresse) return { ok: false, fehler: "Bitte die Adresse der Liegenschaft angeben." };
  if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 50) return { ok: false, fehler: "Anzahl Aufzüge: bitte eine Zahl zwischen 1 und 50." };
  if (f.get("pauschale") !== "on") return { ok: false, fehler: `Bitte bestätigen Sie den Fixpreis von CHF ${BERATUNG_PREIS_CHF}.` };

  try {
    await beratungAnlegen(await db(), { name, email, telefon, adresse, anzahlAufzuege: anzahl, bemerkung, termin: { datum, zeit } });
  } catch (e) {
    if (e instanceof TerminVergeben)
      return { ok: false, vergeben: true, fehler: "Dieser Termin wurde soeben vergeben. Bitte wählen Sie eine andere Zeit." };
    throw e;
  }
  return { ok: true };
}
