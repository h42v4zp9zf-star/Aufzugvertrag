// Inhalt der E-Mails an Dario (Entscheid 24.11.2026): Betreff mit Termin bzw. Paket und Name,
// kurzer Text, PDF mit allen Angaben und bei der Beratung die hochgeladenen Dokumente als Anhang.

import { liegenschaftText } from "./adresse.ts";
import { anfragePdf, beratungPdf, chfPdf, groesseKurz, type AnfragePdfEingabe, type BeratungPdfEingabe, type Kunde } from "./buchungPdf.ts";
import type { Anhang, Mail } from "./mail.ts";
import { dauerText, fristText } from "./pricing.ts";

const STUFE_TEXT = { basis: "Basis", standard: "Standard", komplett: "Komplett" } as const;

/** Dateiname ohne Zeichen, die in Windows oder Mailprogrammen Probleme machen. */
export function pdfDateiname(...teile: string[]): string {
  const name = teile.join(" ").replace(/[\\/:*?"<>|\r\n\t]+/g, "-").replace(/\s+/g, " ").trim();
  return `${name.slice(0, 120)}.pdf`;
}

const zeile = (label: string, wert: string) => (wert.trim() ? `${label}: ${wert.trim()}` : null);

/** Kontakt- und Rechnungsangaben des Kunden als Textzeilen (Paket 2, Verbesserung Nr. 3). */
const kundeZeilen = (k: Kunde) => [
  zeile("Name", k.name),
  zeile("E-Mail", k.email),
  zeile("Telefon", k.telefon),
  zeile("Firma oder Verwaltung", k.firma ?? ""),
  zeile("Adresse der Liegenschaft", liegenschaftText(k)),
  zeile("Rechnungsadresse", k.rechnungsadresse?.trim() ? k.rechnungsadresse.replace(/\s*\n\s*/g, ", ") : "wie Adresse der Liegenschaft"),
];

export async function beratungMail(
  e: BeratungPdfEingabe & { datum: string; zeit: string; dokumenteInhalt: Anhang[]; verwaltungUrl: string | null },
): Promise<Mail> {
  const pdf = await beratungPdf(e);
  const text = [
    "Neue Buchung «Beratung vor Ort»",
    "",
    zeile("Termin", e.termin),
    ...kundeZeilen(e.kunde),
    zeile("Anzahl Aufzüge", String(e.anzahlAufzuege)),
    zeile("Bemerkung", e.bemerkung),
    zeile("Preis", `${chfPdf(e.preisChf)} exkl. MWST (Fixpreis)`),
    e.dokumente.length
      ? `Dokumente im Anhang: ${e.dokumente.map((d) => `${d.dateiname} (${groesseKurz(d.groesse)})`).join(", ")}`
      : "Keine Dokumente hochgeladen.",
    "",
    "Alle Angaben stehen auch im PDF im Anhang.",
    e.verwaltungUrl ? `Verwaltung: ${e.verwaltungUrl}` : null,
  ].filter((z): z is string => z !== null);
  return {
    betreff: `Neue Beratung vor Ort: ${e.termin} – ${e.kunde.name}`,
    text: text.join("\n"),
    anhaenge: [
      { dateiname: pdfDateiname("Beratung", e.datum, e.zeit.replace(":", ""), e.kunde.name), inhalt: pdf },
      ...e.dokumenteInhalt,
    ],
  };
}

export async function anfrageMail(e: AnfragePdfEingabe & { verwaltungUrl: string | null }): Promise<Mail> {
  const pdf = await anfragePdf(e);
  const paket = STUFE_TEXT[e.stufe];
  const dauer = e.vertragsdauerJahre
    ? `${dauerText(e.vertragsdauerJahre)}${e.kuendigungsfristMonate ? `, Kündigungsfrist ${fristText(e.kuendigungsfristMonate)}` : ""}`
    : "nicht angegeben";
  const text = [
    "Ein Kunde hat ein Angebot angenommen.",
    "",
    zeile("Liftfirma", e.firma),
    zeile("Paket", paket),
    zeile("Preis pro Jahr", `${chfPdf(e.preisProJahrChf)} exkl. MWST`),
    zeile("Vertragsdauer", dauer),
    zeile("Vermittlungsgebühr", `${chfPdf(e.gebuehrChf)} exkl. MWST, nur wenn der Vertrag zustande kommt`),
    "",
    ...kundeZeilen(e.kunde),
    "",
    "Alle Angaben zur Anlage stehen im PDF im Anhang.",
    e.verwaltungUrl ? `Verwaltung: ${e.verwaltungUrl}` : null,
  ].filter((z): z is string => z !== null);
  const tag = e.angenommenAm.toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
  return {
    betreff: `Angebot angenommen: ${paket} bei ${e.firma} – ${e.kunde.name}`,
    text: text.join("\n"),
    anhaenge: [{ dateiname: pdfDateiname("Anfrage", tag, e.firma, e.kunde.name), inhalt: pdf }],
  };
}

/** Mail an eine Liftfirma mit dem Link zum Zurücksetzen des Passworts. */
export function passwortMail(e: { marke: string; firma: string; url: string; gueltig: string }): Mail {
  return {
    betreff: `${e.marke}: Passwort zurücksetzen`,
    text: [
      "Guten Tag",
      "",
      `Sie haben für das Konto «${e.firma}» bei ${e.marke} ein neues Passwort angefordert. Über diesen Link setzen Sie es neu:`,
      "",
      e.url,
      "",
      `Der Link gilt ${e.gueltig} und funktioniert nur einmal. Falls Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren. Ihr bisheriges Passwort bleibt dann gültig.`,
      "",
      "Freundliche Grüsse",
      e.marke,
    ].join("\n"),
    anhaenge: [],
  };
}
