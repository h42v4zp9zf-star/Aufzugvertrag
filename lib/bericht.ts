// Bericht zur Beratung vor Ort als PDF (Wunsch Dario, 23.11.2026): Anlagedaten, Zustand mit
// Fotos, heutige Wartung, Empfehlung, Link zu den Angeboten und Unterschrift des Kunden.
// Schrift Helvetica (im PDF eingebaut), Farben wie die Website: schwarz/weiss.

import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  BEWERTUNG_TEXT,
  FOTO_STELLEN,
  PAKET_TEXT,
  ROLLEN,
  ZUSTAND_PUNKTE,
  type AufzugCheck,
  type ChecklisteDaten,
  type Foto,
} from "./checkliste.ts";
import { WARTUNGEN_PRO_STUFE } from "./pricing.ts";

export interface BerichtEingabe {
  marke: string;
  kontaktEmail: string;
  berater: string;
  kunde: { name: string; email: string; telefon: string; adresse: string };
  /** Termin als Text, z. B. „Mittwoch, 25. November 2026, 09:00–10:00 Uhr“. */
  termin: string | null;
  daten: ChecklisteDaten;
  /** Verkleinerte Fotos (JPG) nach Foto-Kennung. */
  bilder: Map<string, Uint8Array>;
  /** Logo als PNG; ohne Logo steht der Markenname als Text. */
  logo?: Uint8Array | null;
  angeboteUrl?: string | null;
  /** Für Tests: fester Zeitpunkt statt „jetzt“. */
  erstelltAm?: Date;
}

const A4: [number, number] = [595.28, 841.89];
const RAND = 50;
const BREITE = A4[0] - 2 * RAND;
const UNTEN = 64; // Platz für die Fusszeile
const LABEL_BREITE = 170;
const TINTE = rgb(0.09, 0.102, 0.125); // #171a20 wie die Website
const GRAU = rgb(0.38, 0.39, 0.42);
const LINIE = rgb(0.86, 0.86, 0.87);

// Helvetica im PDF kennt nur die westeuropäischen Zeichen (WinAnsi). Alles andere wird
// ohne Akzent geschrieben oder durch „?“ ersetzt, damit der Bericht nie abbricht.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const winAnsi = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.has(ch);
};

export function pdfText(s: string): string {
  let aus = "";
  for (const ch of s.normalize("NFC")) {
    if (winAnsi(ch)) aus += ch;
    else if (ch === "\t") aus += " ";
    else {
      const basis = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      aus += basis && [...basis].every(winAnsi) ? basis : "?";
    }
  }
  return aus;
}

function umbrechen(text: string, font: PDFFont, size: number, breite: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of text.split(/\r?\n/)) {
    let zeile = "";
    for (const wort of pdfText(absatz).split(/ +/)) {
      const probe = zeile ? `${zeile} ${wort}` : wort;
      if (font.widthOfTextAtSize(probe, size) <= breite) {
        zeile = probe;
        continue;
      }
      if (zeile) zeilen.push(zeile);
      let rest = wort;
      while (font.widthOfTextAtSize(rest, size) > breite && rest.length > 1) {
        let n = rest.length - 1;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > breite) n--;
        zeilen.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      zeile = rest;
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

const datum = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso);
const jaNein = (v: string) => ({ ja: "Ja", nein: "Nein", unbekannt: "Unbekannt", unklar: "Unklar" })[v] ?? "";
const wichtig = (v: string) => ({ wichtig: "Wichtig", egal: "Nicht so wichtig" })[v] ?? "";
const chfText = (s: string) => {
  const n = Number(s.replace(/['’\s]/g, "").replace(",", "."));
  return Number.isFinite(n) && s.trim() ? `CHF ${Math.round(n).toLocaleString("de-CH").replace(/[’’]/g, "'")} pro Jahr` : s;
};
const paketText = (p: string) =>
  p === "basis" || p === "standard" || p === "komplett"
    ? `${PAKET_TEXT[p]} (${WARTUNGEN_PRO_STUFE[p]} Wartungen pro Jahr)`
    : p === "offen"
      ? "Noch offen"
      : "";

class Seiten {
  seite!: PDFPage;
  y = 0;
  readonly pdf: PDFDocument;
  readonly font: PDFFont;
  readonly fett: PDFFont;
  constructor(pdf: PDFDocument, font: PDFFont, fett: PDFFont) {
    this.pdf = pdf;
    this.font = font;
    this.fett = fett;
  }

  neu() {
    this.seite = this.pdf.addPage(A4);
    this.y = A4[1] - RAND;
  }

  platz(hoehe: number) {
    if (this.y - hoehe < UNTEN) this.neu();
  }

  schreiben(t: string, x: number, y: number, size: number, fett = false, farbe = TINTE) {
    this.seite.drawText(pdfText(t), { x, y, size, font: fett ? this.fett : this.font, color: farbe });
  }

  linie(y: number, x1 = RAND, x2 = RAND + BREITE) {
    this.seite.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.6, color: LINIE });
  }

  ueberschrift(t: string, mitPlatzFuer = 60) {
    this.platz(34 + mitPlatzFuer);
    this.y -= 26;
    this.schreiben(t, RAND, this.y, 13, true);
    this.y -= 9;
    this.linie(this.y);
    this.y -= 6;
  }

  /** Zeile „Bezeichnung … Wert“; leere Werte werden weggelassen. */
  zeile(label: string, wert: string) {
    if (!wert.trim()) return;
    const zeilen = umbrechen(wert, this.font, 10, BREITE - LABEL_BREITE);
    const hoehe = zeilen.length * 13 + 9;
    this.platz(hoehe);
    this.y -= 15;
    this.schreiben(label, RAND, this.y, 9.5, false, GRAU);
    zeilen.forEach((z, i) => this.schreiben(z, RAND + LABEL_BREITE, this.y - i * 13, 10));
    this.y -= (zeilen.length - 1) * 13 + 3;
  }

  absatz(t: string, size = 10, farbe = TINTE, fett = false) {
    for (const z of umbrechen(t, fett ? this.fett : this.font, size, BREITE)) {
      this.platz(size + 6);
      this.y -= size + 4;
      this.schreiben(z, RAND, this.y, size, fett, farbe);
    }
  }
}

function zeilenListe(paare: [string, string][]): [string, string][] {
  return paare.filter(([, w]) => w.trim() !== "");
}

function anlageZeilen(a: AufzugCheck): [string, string][] {
  const hersteller = a.hersteller === "unbekannt" ? "Unbekannt" : a.hersteller === "Andere" ? "Anderer Hersteller" : a.hersteller;
  const tueren = { schiebe: "Automatische Schiebetüren", dreh: "Drehtüren von Hand" }[a.tueren as "schiebe" | "dreh"] ?? "";
  const notruf = a.notruf ? `${jaNein(a.notruf)}${a.notrufVerbunden.trim() ? `, verbunden mit ${a.notrufVerbunden.trim()}` : ""}` : "";
  return zeilenListe([
    ["Hersteller", hersteller],
    ["Baujahr", a.baujahr],
    ["Fabrik- oder Anlagenummer", a.fabriknummer],
    ["Aufzugsart", a.aufzugsart],
    ["Antrieb", { seil: "Seil", hydraulik: "Hydraulik", unbekannt: "Unbekannt" }[a.antrieb as "seil"] ?? ""],
    ["Maschinenraum", { mit: "Mit Maschinenraum", ohne: "Ohne Maschinenraum" }[a.maschinenraum as "mit"] ?? ""],
    ["Traglast", a.traglastKg.trim() ? `${a.traglastKg.trim()} kg` : ""],
    ["Personen", a.personen],
    ["Geschwindigkeit", a.geschwindigkeit.trim() ? `${a.geschwindigkeit.trim().replace(".", ",")} m/s` : ""],
    ["Haltestellen", a.haltestellen],
    ["Zugänge", a.zugaenge],
    ["Türen", tueren],
    ["Kabinenabschlusstüren", jaNein(a.kabinenabschlusstueren)],
    ["Brandfallsteuerung", jaNein(a.brandfall)],
    ["Notruf in der Kabine", notruf],
  ]);
}

function zustandZeichnen(s: Seiten, a: AufzugCheck) {
  const punkte = ZUSTAND_PUNKTE.filter((p) => a.zustand[p.key] || a.zustandNotiz[p.key].trim());
  const extra = zeilenListe([
    ["Notruf getestet", a.notrufGetestet === "ja" ? "Funktioniert" : a.notrufGetestet === "nein" ? "Funktioniert nicht" : ""],
    ["Ölverlust sichtbar", jaNein(a.oelverlust)],
  ]);
  if (punkte.length === 0 && extra.length === 0) return;
  s.platz(40);
  s.y -= 22;
  s.schreiben("Zustand (Sichtprüfung)", RAND, s.y, 10.5, true);
  s.y -= 4;
  for (const p of punkte) {
    const bewertung = a.zustand[p.key] ? BEWERTUNG_TEXT[a.zustand[p.key] as "gut"] : "";
    const notiz = umbrechen(a.zustandNotiz[p.key].trim(), s.font, 9.5, BREITE - LABEL_BREITE - 80);
    const hoehe = Math.max(1, notiz.filter(Boolean).length) * 12 + 10;
    s.platz(hoehe);
    s.y -= 15;
    s.schreiben(p.label, RAND, s.y, 9.5, false, GRAU);
    s.schreiben(bewertung, RAND + LABEL_BREITE, s.y, 10, bewertung === "Schlecht");
    notiz.forEach((z, i) => s.schreiben(z, RAND + LABEL_BREITE + 80, s.y - i * 12, 9.5));
    s.y -= Math.max(0, notiz.length - 1) * 12 + 2;
  }
  for (const [l, w] of extra) s.zeile(l, w);
}

function fotosZeichnen(s: Seiten, titel: string, fotos: Foto[], bilder: Map<string, PDFImage | null>) {
  if (fotos.length === 0) return;
  const reihenfolge = FOTO_STELLEN.map((x) => x.key as string);
  const sortiert = [...fotos].sort((a, b) => reihenfolge.indexOf(a.stelle) - reihenfolge.indexOf(b.stelle));
  const spalte = (BREITE - 16) / 2;
  const bildH = 172;
  const zeileH = bildH + 46;
  s.ueberschrift(titel, zeileH);
  for (let i = 0; i < sortiert.length; i += 2) {
    s.platz(zeileH);
    const oben = s.y - 8;
    for (let j = 0; j < 2 && i + j < sortiert.length; j++) {
      const f = sortiert[i + j];
      const x = RAND + j * (spalte + 16);
      const bild = bilder.get(f.id);
      if (bild) {
        const m = Math.min(spalte / bild.width, bildH / bild.height);
        const w = bild.width * m;
        const h = bild.height * m;
        s.seite.drawImage(bild, { x: x + (spalte - w) / 2, y: oben - bildH + (bildH - h) / 2, width: w, height: h });
      } else {
        s.seite.drawRectangle({ x, y: oben - bildH, width: spalte, height: bildH, borderColor: LINIE, borderWidth: 0.8 });
        s.schreiben("Foto nicht verfügbar", x + 12, oben - bildH / 2, 9, false, GRAU);
      }
      const stelle = FOTO_STELLEN.find((x2) => x2.key === f.stelle)?.label.replace(/, z\. B\..*$/, "") ?? "";
      s.schreiben(stelle, x, oben - bildH - 14, 9, true);
      umbrechen(f.notiz.trim(), s.font, 9, spalte)
        .filter(Boolean)
        .slice(0, 2)
        .forEach((z, k) => s.schreiben(z, x, oben - bildH - 27 - k * 11, 9, false, GRAU));
    }
    s.y = oben - zeileH + 8;
  }
}

function linkKnopf(s: Seiten, url: string) {
  const text = "Angebote für Ihre Anlage ansehen";
  const breite = s.fett.widthOfTextAtSize(pdfText(text), 11) + 40;
  const hoehe = 30;
  s.platz(hoehe + 40);
  s.y -= 14 + hoehe;
  const rect = { x: RAND, y: s.y, width: breite, height: hoehe };
  s.seite.drawRectangle({ ...rect, color: TINTE });
  s.schreiben(text, RAND + 20, s.y + 11, 11, true, rgb(1, 1, 1));
  const annot = s.pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  s.seite.node.addAnnot(s.pdf.context.register(annot));
  s.y -= 4;
  for (const z of umbrechen(url, s.font, 7.5, BREITE)) {
    s.y -= 10;
    s.schreiben(z, RAND, s.y, 7.5, false, GRAU);
  }
}

export async function berichtErstellen(e: BerichtEingabe): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const jetzt = e.erstelltAm ?? new Date();
  pdf.setTitle(`Bericht Beratung vor Ort – ${e.kunde.name}`);
  pdf.setAuthor(e.marke);
  pdf.setCreator(e.marke);
  pdf.setProducer(e.marke);
  pdf.setCreationDate(jetzt);
  pdf.setModificationDate(jetzt);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
  const s = new Seiten(pdf, font, fett);
  const d = e.daten;
  s.neu();

  // Kopf: Logo, Titel, Kunde
  let logo: PDFImage | null = null;
  try {
    logo = e.logo ? await pdf.embedPng(e.logo) : null;
  } catch {
    logo = null;
  }
  if (logo) {
    const h = 16;
    s.seite.drawImage(logo, { x: RAND, y: s.y - h, width: (logo.width / logo.height) * h, height: h });
  } else {
    s.schreiben(e.marke.toUpperCase().split("").join(" "), RAND, s.y - 14, 14, true);
  }
  s.y -= 64;
  s.schreiben("Bericht Beratung vor Ort", RAND, s.y, 22, false);
  if (e.termin) {
    s.y -= 20;
    s.schreiben(e.termin, RAND, s.y, 11, false, GRAU);
  }
  s.y -= 10;
  s.zeile("Kunde", e.kunde.name);
  s.zeile("Adresse der Liegenschaft", e.kunde.adresse);
  s.zeile("Telefon", e.kunde.telefon);
  s.zeile("E-Mail", e.kunde.email);
  s.zeile("Beratung durch", `${e.berater}, ${e.marke}`);

  // Kontakt und Liegenschaft
  const rolle = ROLLEN.find((r) => r.value === d.kontakt.rolle)?.label ?? "";
  const liegenschaft = zeilenListe([
    ["Ansprechperson vor Ort", [d.kontakt.ansprechperson, d.kontakt.ansprechTelefon].filter((x) => x.trim()).join(", ")],
    ["Rolle", rolle],
    ["Gebäudetyp", d.liegenschaft.gebaeudetyp],
    ["Stockwerke", d.liegenschaft.stockwerke],
    ["Attika", jaNein(d.liegenschaft.attika)],
    ["Zugang Maschinenraum", d.liegenschaft.schluessel],
  ]);
  if (liegenschaft.length) {
    s.ueberschrift("Liegenschaft");
    for (const [l, w] of liegenschaft) s.zeile(l, w);
  }

  // Pro Aufzug: Anlagedaten und Zustand
  for (const a of d.aufzuege) {
    s.ueberschrift(d.aufzuege.length > 1 ? `${a.bezeichnung || "Aufzug"}: Anlagedaten` : "Anlagedaten");
    for (const [l, w] of anlageZeilen(a)) s.zeile(l, w);
    zustandZeichnen(s, a);
  }

  // Heutige Wartung
  const w = d.wartung;
  const wartung = zeilenListe([
    ["Wartungsfirma", w.firma === "unbekannt" ? "" : w.firma],
    ["Kosten", chfText(w.kostenChf)],
    ["Wartungen pro Jahr", w.wartungenProJahr],
    ["Pikett 24 Stunden", jaNein(w.pikett24h)],
    ["Vertragsbeginn", datum(w.vertragsbeginn)],
    ["Laufzeit", w.laufzeit],
    ["Kündigungsfrist", w.kuendigungsfrist],
    ["Nächster Kündigungstermin", datum(w.kuendigungstermin)],
    ["Letzte Wartung", datum(w.letzteWartung)],
    ["Letzte periodische Kontrolle", datum(w.letzteKontrolle)],
    ["Offene Mängel aus der Kontrolle", w.offeneMaengel],
    ["Störungen pro Jahr", w.stoerungenProJahr],
    ["Zufriedenheit", w.zufriedenheit ? `${w.zufriedenheit} von 5${w.zufriedenheitNotiz.trim() ? `, ${w.zufriedenheitNotiz.trim()}` : ""}` : ""],
  ]);
  if (wartung.length) {
    s.ueberschrift("Heutige Wartung");
    for (const [l, x] of wartung) s.zeile(l, x);
  }

  // Wünsche
  const wu = d.wuensche;
  const wuensche = zeilenListe([
    ["Gewünschtes Paket", paketText(wu.paket)],
    ["Pikett 24 Stunden", wichtig(wu.pikett)],
    ["Kurze Reaktionszeit", wichtig(wu.reaktion)],
    ["Tiefer Preis", wichtig(wu.preis)],
    ["Modernisierung geplant", jaNein(wu.modernisierung)],
    ["Weitere Wünsche", wu.weitere],
  ]);
  if (wuensche.length) {
    s.ueberschrift("Ihre Wünsche");
    for (const [l, x] of wuensche) s.zeile(l, x);
  }

  // Empfehlung und nächste Schritte
  const ab = d.abschluss;
  const schritte = [
    ab.schritte.vergleichen && "Angebote vergleichen",
    ab.schritte.kuendigen && "Bisherigen Wartungsvertrag kündigen",
    ab.schritte.kontrollbericht && "Letzten Kontrollbericht nachreichen",
  ].filter((x): x is string => !!x);
  if (ab.empfehlung || ab.begruendung.trim() || schritte.length || e.angeboteUrl) {
    s.ueberschrift("Unsere Empfehlung");
    s.zeile("Empfohlenes Paket", paketText(ab.empfehlung));
    s.zeile("Begründung", ab.begruendung);
    s.zeile("Nächste Schritte", schritte.map((x) => `• ${x}`).join("\n"));
    if (e.angeboteUrl) linkKnopf(s, e.angeboteUrl);
  }

  // Unterschrift
  if (ab.unterschrift) {
    let sig: PDFImage | null = null;
    try {
      sig = await pdf.embedPng(Buffer.from(ab.unterschrift.split(",")[1] ?? "", "base64"));
    } catch {
      sig = null;
    }
    if (sig) {
      s.ueberschrift("Bestätigung der Beratung", 110);
      const h = 70;
      const breite = Math.min(240, (sig.width / sig.height) * h);
      s.y -= h + 8;
      s.seite.drawImage(sig, { x: RAND, y: s.y, width: breite, height: (breite / sig.width) * sig.height });
      s.linie(s.y - 4, RAND, RAND + 240);
      s.y -= 18;
      const wann = ab.abgeschlossenAm ? new Date(ab.abgeschlossenAm) : jetzt;
      s.schreiben(
        `${ab.unterschriftName || e.kunde.name}, ${wann.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" })}`,
        RAND,
        s.y,
        9.5,
        false,
        GRAU,
      );
    }
  }

  // Anhang: Fotos pro Aufzug
  const bilder = new Map<string, PDFImage | null>();
  for (const f of d.fotos) {
    const roh = e.bilder.get(f.id);
    try {
      bilder.set(f.id, roh ? await pdf.embedJpg(roh) : null);
    } catch {
      bilder.set(f.id, null);
    }
  }
  for (const a of d.aufzuege) {
    const fotos = d.fotos.filter((f) => f.aufzug === a.id);
    fotosZeichnen(s, d.aufzuege.length > 1 ? `Fotos: ${a.bezeichnung || "Aufzug"}` : "Fotos", fotos, bilder);
  }

  // Fusszeile auf jeder Seite
  const seiten = pdf.getPages();
  seiten.forEach((p, i) => {
    const y = 34;
    p.drawLine({ start: { x: RAND, y: y + 14 }, end: { x: RAND + BREITE, y: y + 14 }, thickness: 0.6, color: LINIE });
    p.drawText(pdfText(`${e.marke} · ${e.kontaktEmail}`), { x: RAND, y, size: 8, font, color: GRAU });
    const rechts = `Seite ${i + 1} von ${seiten.length}`;
    p.drawText(rechts, { x: RAND + BREITE - font.widthOfTextAtSize(rechts, 8), y, size: 8, font, color: GRAU });
    p.drawText(pdfText("Sichtprüfung vor Ort, ersetzt keine periodische Kontrolle."), { x: RAND, y: y - 11, size: 7.5, font, color: GRAU });
  });
  return pdf.save();
}
