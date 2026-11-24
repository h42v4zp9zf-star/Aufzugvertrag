"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { beratungMail } from "@/lib/benachrichtigung";
import { BERATUNG_PREIS_CHF, KONTAKT_EMAIL, MARKE } from "@/lib/config";
import { db, dbKonfiguriert } from "@/lib/db";
import { DOKUMENTE_MAX_ANZAHL, DOKUMENTE_MAX_BYTES, dokumentTyp, sichererDateiname } from "@/lib/dokumente";
import { benachrichtigen } from "@/lib/mail";
import { beratungAnlegen, TerminVergeben, type NeuesDokument } from "@/lib/repo";
import { logoLaden, seitenAdresse } from "@/lib/seite";
import { heuteInZuerich, terminGueltig, terminText } from "@/lib/termine";

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

  // Freiwillige Dokumente: Anzahl, Gesamtgrösse und Dateityp (am Inhalt erkannt) prüfen.
  const dateien = f.getAll("dokumente").filter((x): x is File => typeof x !== "string" && x.size > 0);
  if (dateien.length > DOKUMENTE_MAX_ANZAHL) return { ok: false, fehler: `Bitte höchstens ${DOKUMENTE_MAX_ANZAHL} Dokumente hochladen.` };
  if (dateien.reduce((s, x) => s + x.size, 0) > DOKUMENTE_MAX_BYTES)
    return { ok: false, fehler: "Die Dokumente sind zusammen grösser als 4 MB. Bitte kleinere Dateien wählen." };
  const dokumente: NeuesDokument[] = [];
  for (const datei of dateien) {
    const inhalt = Buffer.from(await datei.arrayBuffer());
    const typ = dokumentTyp(inhalt);
    if (!typ) return { ok: false, fehler: `„${datei.name}“ ist kein PDF, JPG oder PNG. Bitte nur diese Dateitypen hochladen.` };
    dokumente.push({ dateiname: sichererDateiname(datei.name, typ), typ, inhalt });
  }

  try {
    await beratungAnlegen(await db(), { name, email, telefon, adresse, anzahlAufzuege: anzahl, bemerkung, termin: { datum, zeit }, dokumente });
  } catch (e) {
    if (e instanceof TerminVergeben)
      return { ok: false, vergeben: true, fehler: "Dieser Termin wurde soeben vergeben. Bitte wählen Sie eine andere Zeit." };
    throw e;
  }

  // E-Mail an Dario mit PDF und Dokumenten, erst nach der Antwort an den Kunden.
  // Klappt der Versand nicht, bleibt die Buchung trotzdem gespeichert.
  const gebuchtAm = new Date();
  const adresseSeite = seitenAdresse(await headers());
  after(() =>
    benachrichtigen("Beratung vor Ort", async () =>
      beratungMail({
        marke: MARKE,
        kontaktEmail: KONTAKT_EMAIL,
        logo: await logoLaden(),
        datum,
        zeit,
        termin: terminText(datum, zeit),
        kunde: { name, email, telefon, adresse },
        anzahlAufzuege: anzahl,
        bemerkung,
        preisChf: BERATUNG_PREIS_CHF,
        gebuchtAm,
        dokumente: dokumente.map((x) => ({ dateiname: x.dateiname, groesse: x.inhalt.length })),
        dokumenteInhalt: dokumente.map((x) => ({ dateiname: x.dateiname, inhalt: x.inhalt })),
        verwaltungUrl: adresseSeite ? `${adresseSeite}/admin` : null,
      }),
    ),
  );
  return { ok: true };
}
