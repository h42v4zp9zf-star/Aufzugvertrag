"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { fromParams } from "@/lib/anlageParams";
import { anfrageMail } from "@/lib/benachrichtigung";
import { KONTAKT_EMAIL, MARKE } from "@/lib/config";
import { db, dbKonfiguriert } from "@/lib/db";
import { benachrichtigen } from "@/lib/mail";
import { deckt, preisProAufzug, STUFEN, VERMITTLUNGSGEBUEHR_CHF, type Stufe } from "@/lib/pricing";
import { aktivePreismodelle, anfrageAnlegen } from "@/lib/repo";
import { ipSchluessel, MELDUNG_ZU_VIELE, versuchMerken, zuViele } from "@/lib/schutz";
import { logoLaden, seitenAdresse } from "@/lib/seite";
import { istSpam, MELDUNG_SPAM } from "@/lib/spamfalle";

export interface AnfrageEingabe {
  anlageParams: string;
  firmaId: number;
  stufe: Stufe;
  name: string;
  email: string;
  telefon: string;
  adresse: string;
  /** Unsichtbares Feld gegen Spam (Verbesserung Nr. 32), muss leer sein. */
  webseite?: string;
}

export type AnfrageErgebnis = { ok: true } | { ok: false; fehler: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function anfrageSenden(e: AnfrageEingabe): Promise<AnfrageErgebnis> {
  if (!dbKonfiguriert()) return { ok: false, fehler: "Anfragen sind in der Vorschau noch nicht möglich." };
  if (istSpam(e.webseite)) return { ok: false, fehler: `${MELDUNG_SPAM} Oder schreiben Sie uns an ${KONTAKT_EMAIL}.` };
  const name = String(e.name ?? "").trim().slice(0, 200);
  const email = String(e.email ?? "").trim().slice(0, 200);
  const telefon = String(e.telefon ?? "").trim().slice(0, 50);
  const adresse = String(e.adresse ?? "").trim().slice(0, 300);
  if (!name) return { ok: false, fehler: "Bitte Ihren Namen angeben." };
  if (!EMAIL.test(email)) return { ok: false, fehler: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (!STUFEN.includes(e.stufe)) return { ok: false, fehler: "Unbekanntes Paket." };

  const anlage = fromParams(new URLSearchParams(String(e.anlageParams ?? "")));
  if (!anlage) return { ok: false, fehler: "Die Angaben zur Anlage fehlen." };

  // Preis serverseitig neu berechnen, nie den Preis aus dem Browser übernehmen.
  const d = await db();
  const modell = (await aktivePreismodelle(d)).find((m) => m.firmaId === e.firmaId);
  const paket = modell?.pakete.find((p) => p.stufe === e.stufe);
  if (!modell || !paket || !deckt(modell, anlage)) {
    return { ok: false, fehler: "Dieses Angebot ist nicht mehr verfügbar. Bitte laden Sie die Seite neu." };
  }
  const proAufzug = preisProAufzug(modell, paket, anlage, []);
  if (proAufzug === null) return { ok: false, fehler: "Dieses Angebot ist nicht mehr verfügbar." };

  // Höchstens 10 Anfragen pro Stunde vom selben Anschluss (Verbesserung Nr. 32).
  const h = await headers();
  const ip = ipSchluessel(h);
  if (await zuViele(d, "anfrage", ip)) return { ok: false, fehler: `${MELDUNG_ZU_VIELE} Oder schreiben Sie uns an ${KONTAKT_EMAIL}.` };
  await versuchMerken(d, "anfrage", ip);

  const preisChf = Math.round(proAufzug * Math.max(1, anlage.anzahlAufzuege));
  await anfrageAnlegen(d, {
    kontoId: modell.firmaId!,
    stufe: e.stufe,
    preisChf,
    anlage,
    name,
    email,
    telefon,
    adresse,
  });

  // E-Mail an Dario mit PDF der Anfrage, erst nach der Antwort an den Kunden.
  const angenommenAm = new Date();
  const adresseSeite = seitenAdresse(h);
  const stufe = e.stufe;
  after(() =>
    benachrichtigen("Angebot angenommen", async () =>
      anfrageMail({
        marke: MARKE,
        kontaktEmail: KONTAKT_EMAIL,
        logo: await logoLaden(),
        firma: modell.firma,
        stufe,
        preisProJahrChf: preisChf,
        vertragsdauerJahre: paket.vertragsdauerJahre,
        kuendigungsfristMonate: paket.kuendigungsfristMonate,
        gebuehrChf: VERMITTLUNGSGEBUEHR_CHF,
        kunde: { name, email, telefon, adresse },
        anlage,
        angenommenAm,
        verwaltungUrl: adresseSeite ? `${adresseSeite}/admin?bereich=anfragen` : null,
      }),
    ),
  );
  return { ok: true };
}
