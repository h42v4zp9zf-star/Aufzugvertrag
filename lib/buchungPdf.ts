// PDFs für die Benachrichtigung an Dario (Entscheid 24.11.2026): eine Seite mit allen Angaben
// einer Buchung „Beratung vor Ort“ bzw. einer angenommenen Offerte. Gleicher Stil wie der Bericht.

import { PDFDocument, StandardFonts, type PDFFont, type PDFImage } from "pdf-lib";
import { BREITE, GRAU, LINIE, RAND, Seiten, pdfText } from "./bericht.ts";
import { dauerText, fristText, WARTUNGEN_PRO_STUFE, type Anlage, type Stufe } from "./pricing.ts";

interface Grundangaben {
  marke: string;
  kontaktEmail: string;
  /** Logo als PNG; ohne Logo steht der Markenname als Text. */
  logo?: Uint8Array | null;
}

export interface Kunde {
  name: string;
  email: string;
  telefon: string;
  adresse: string;
}

export interface BeratungPdfEingabe extends Grundangaben {
  /** z. B. „Mittwoch, 25. November 2026, 09:00–10:00 Uhr“ */
  termin: string;
  kunde: Kunde;
  anzahlAufzuege: number;
  bemerkung: string;
  preisChf: number;
  gebuchtAm: Date;
  dokumente: { dateiname: string; groesse: number }[];
}

export interface AnfragePdfEingabe extends Grundangaben {
  firma: string;
  stufe: Stufe;
  preisProJahrChf: number;
  vertragsdauerJahre?: number;
  kuendigungsfristMonate?: number;
  gebuehrChf: number;
  kunde: Kunde;
  anlage: Anlage;
  angenommenAm: Date;
}

const STUFE_TEXT: Record<Stufe, string> = { basis: "Basis", standard: "Standard", komplett: "Komplett" };
const ANTRIEB: Record<string, string> = { seil: "Seil", hydraulik: "Hydraulik", unbekannt: "Unbekannt" };
const JA_NEIN: Record<string, string> = { ja: "Ja", nein: "Nein", unbekannt: "Unbekannt" };

/** „24.11.2026, 16:30 Uhr“ in Schweizer Zeit. */
export function zeitpunktText(d: Date): string {
  const t = d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  });
  return `${t} Uhr`;
}

/** CHF mit Schweizer Tausendertrennzeichen, im PDF immer mit geradem Apostroph. */
export function chfPdf(betrag: number): string {
  return `CHF ${Math.round(betrag).toLocaleString("de-CH").replace(/[’‘]/g, "'")}`;
}

export function groesseKurz(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

async function starten(g: Grundangaben, titel: string, untertitel: string, zeitpunkt: Date) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${titel} – ${untertitel}`);
  pdf.setAuthor(g.marke);
  pdf.setCreator(g.marke);
  pdf.setProducer(g.marke);
  pdf.setCreationDate(zeitpunkt);
  pdf.setModificationDate(zeitpunkt);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
  const s = new Seiten(pdf, font, fett);
  s.neu();
  let logo: PDFImage | null = null;
  try {
    logo = g.logo ? await pdf.embedPng(g.logo) : null;
  } catch {
    logo = null;
  }
  if (logo) {
    const h = 16;
    s.seite.drawImage(logo, { x: RAND, y: s.y - h, width: (logo.width / logo.height) * h, height: h });
  } else {
    s.schreiben(g.marke.toUpperCase().split("").join(" "), RAND, s.y - 14, 14, true);
  }
  s.y -= 64;
  s.schreiben(titel, RAND, s.y, 22);
  s.y -= 20;
  s.schreiben(untertitel, RAND, s.y, 11, false, GRAU);
  s.y -= 10;
  return { pdf, s, font };
}

async function abschliessen(pdf: PDFDocument, font: PDFFont, g: Grundangaben) {
  const seiten = pdf.getPages();
  seiten.forEach((p, i) => {
    const y = 34;
    p.drawLine({ start: { x: RAND, y: y + 14 }, end: { x: RAND + BREITE, y: y + 14 }, thickness: 0.6, color: LINIE });
    p.drawText(pdfText(`${g.marke} · ${g.kontaktEmail}`), { x: RAND, y, size: 8, font, color: GRAU });
    const rechts = `Seite ${i + 1} von ${seiten.length}`;
    p.drawText(rechts, { x: RAND + BREITE - font.widthOfTextAtSize(rechts, 8), y, size: 8, font, color: GRAU });
  });
  return pdf.save();
}

function kundeZeichnen(s: Seiten, k: Kunde, titel = "Kunde") {
  s.ueberschrift(titel);
  s.zeile("Name", k.name);
  s.zeile("E-Mail", k.email);
  s.zeile("Telefon", k.telefon);
  s.zeile("Adresse der Liegenschaft", k.adresse);
}

export async function beratungPdf(e: BeratungPdfEingabe): Promise<Uint8Array> {
  const { pdf, s, font } = await starten(e, "Neue Buchung: Beratung vor Ort", e.termin, e.gebuchtAm);
  s.zeile("Termin", e.termin);
  s.zeile("Preis", `${chfPdf(e.preisChf)} (Fixpreis)`);
  s.zeile("Gebucht am", zeitpunktText(e.gebuchtAm));
  kundeZeichnen(s, e.kunde);
  s.ueberschrift("Anlage");
  s.zeile("Anzahl Aufzüge", String(e.anzahlAufzuege));
  s.zeile("Bemerkung", e.bemerkung || "Keine");
  s.ueberschrift("Dokumente");
  s.zeile(
    e.dokumente.length === 1 ? "1 Dokument" : `${e.dokumente.length} Dokumente`,
    e.dokumente.length ? e.dokumente.map((d) => `${d.dateiname} (${groesseKurz(d.groesse)})`).join("\n") : "Keine hochgeladen",
  );
  if (e.dokumente.length) s.absatz("Die Dokumente sind dieser E-Mail angehängt.", 9, GRAU);
  return abschliessen(pdf, font, e);
}

export function anlageZeilen(a: Anlage): [string, string][] {
  const zeilen: [string, string | undefined][] = [
    ["Gebäudetyp", a.gebaeudetyp],
    ["PLZ", a.plz],
    ["Anzahl Aufzüge", String(a.anzahlAufzuege)],
    ["Aufzugsart", a.aufzugsart],
    ["Antrieb", ANTRIEB[a.antrieb]],
    ["Hersteller", a.hersteller === "unbekannt" ? "Unbekannt" : a.hersteller],
    ["Haltestellen", String(a.haltestellen)],
    ["Baujahr", a.baujahr ? String(a.baujahr) : undefined],
    ["Kabinenabschlusstüren", a.kabinenabschlusstueren !== undefined ? String(a.kabinenabschlusstueren) : undefined],
    ["Traglast", a.traglastKg ? `${a.traglastKg} kg` : undefined],
    ["Geschwindigkeit", a.geschwindigkeitMs ? `${String(a.geschwindigkeitMs).replace(".", ",")} m/s` : undefined],
    ["Brandfallsteuerung", JA_NEIN[a.brandfallsteuerung]],
    ["Attika", a.attika ? JA_NEIN[a.attika] : undefined],
    ["Sicherheitsdispositiv", a.sicherheitsdispositiv ? JA_NEIN[a.sicherheitsdispositiv] : undefined],
  ];
  return zeilen.filter((z): z is [string, string] => !!z[1]);
}

export async function anfragePdf(e: AnfragePdfEingabe): Promise<Uint8Array> {
  const paket = `${STUFE_TEXT[e.stufe]} (${WARTUNGEN_PRO_STUFE[e.stufe]} Wartungen pro Jahr)`;
  const { pdf, s, font } = await starten(e, "Angebot angenommen", `${paket} bei ${e.firma}`, e.angenommenAm);
  s.zeile("Liftfirma", e.firma);
  s.zeile("Paket", paket);
  s.zeile("Preis pro Jahr", chfPdf(e.preisProJahrChf));
  s.zeile("Vertragsdauer", e.vertragsdauerJahre ? dauerText(e.vertragsdauerJahre) : "Nicht angegeben");
  if (e.vertragsdauerJahre && e.kuendigungsfristMonate) s.zeile("Kündigungsfrist", fristText(e.kuendigungsfristMonate));
  s.zeile("Vermittlungsgebühr", `${chfPdf(e.gebuehrChf)}, Zahlung per Rechnung`);
  s.zeile("Angenommen am", zeitpunktText(e.angenommenAm));
  kundeZeichnen(s, e.kunde);
  s.ueberschrift("Anlage");
  for (const [l, w] of anlageZeilen(e.anlage)) s.zeile(l, w);
  return abschliessen(pdf, font, e);
}
