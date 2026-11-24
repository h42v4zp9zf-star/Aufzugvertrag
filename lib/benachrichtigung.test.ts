import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { anfrageMail, beratungMail, passwortMail, pdfDateiname } from "./benachrichtigung.ts";
import { anlageZeilen, chfPdf, zeitpunktText } from "./buchungPdf.ts";
import type { Anlage } from "./pricing.ts";

const logo = readFileSync(new URL("../public/logo/elevaris-logo-v2.png", import.meta.url));
const KUNDE = { name: "Sandra Keller", email: "s.keller@example.ch", telefon: "079 456 78 90", adresse: "Hohlstrasse 120, 8004 Zürich" };
const ANLAGE: Anlage = {
  gebaeudetyp: "Mehrfamilienhaus",
  plz: "8004",
  anzahlAufzuege: 2,
  aufzugsart: "Personenaufzug",
  antrieb: "seil",
  hersteller: "Schindler",
  haltestellen: 6,
  brandfallsteuerung: "nein",
  attika: "ja",
  sicherheitsdispositiv: "ja",
};

async function istPdf(inhalt: Uint8Array) {
  const pdf = await PDFDocument.load(inhalt);
  assert.ok(pdf.getPageCount() >= 1);
  return pdf;
}

test("Beratung: Betreff mit Termin und Name, PDF und Dokumente im Anhang", async () => {
  const dok = new Uint8Array(Buffer.from("%PDF-1.4 Testdokument"));
  const m = await beratungMail({
    marke: "Elevaris",
    kontaktEmail: "info@liftvergleich.ch",
    logo,
    datum: "2026-11-25",
    zeit: "09:00",
    termin: "Mittwoch, 25. November 2026, 09:00–10:00 Uhr",
    kunde: KUNDE,
    anzahlAufzuege: 2,
    bemerkung: "Schlüssel beim Hauswart 😀",
    preisChf: 100,
    gebuchtAm: new Date("2026-11-24T15:30:00Z"),
    dokumente: [{ dateiname: "Wartungsvertrag.pdf", groesse: dok.length }],
    dokumenteInhalt: [{ dateiname: "Wartungsvertrag.pdf", inhalt: dok }],
    verwaltungUrl: "https://example.ch/admin",
  });
  assert.equal(m.betreff, "Neue Beratung vor Ort: Mittwoch, 25. November 2026, 09:00–10:00 Uhr – Sandra Keller");
  assert.match(m.text, /Telefon: 079 456 78 90/);
  assert.match(m.text, /Preis: CHF 100 exkl\. MWST \(Fixpreis\)/);
  assert.match(m.text, /Rechnungsadresse: wie Adresse der Liegenschaft/);
  assert.match(m.text, /Dokumente im Anhang: Wartungsvertrag\.pdf/);
  assert.match(m.text, /Verwaltung: https:\/\/example\.ch\/admin/);
  assert.deepEqual(m.anhaenge.map((a) => a.dateiname), ["Beratung 2026-11-25 0900 Sandra Keller.pdf", "Wartungsvertrag.pdf"]);
  const pdf = await istPdf(m.anhaenge[0].inhalt);
  assert.equal(pdf.getTitle(), "Neue Buchung: Beratung vor Ort – Mittwoch, 25. November 2026, 09:00–10:00 Uhr");
  assert.equal(m.anhaenge[1].inhalt, dok);
});

test("Beratung ohne Dokumente und ohne Bemerkung", async () => {
  const m = await beratungMail({
    marke: "Elevaris",
    kontaktEmail: "info@liftvergleich.ch",
    logo: null,
    datum: "2026-11-25",
    zeit: "14:00",
    termin: "Mittwoch, 25. November 2026, 14:00–15:00 Uhr",
    kunde: KUNDE,
    anzahlAufzuege: 1,
    bemerkung: "",
    preisChf: 100,
    gebuchtAm: new Date("2026-11-24T15:30:00Z"),
    dokumente: [],
    dokumenteInhalt: [],
    verwaltungUrl: null,
  });
  assert.match(m.text, /Keine Dokumente hochgeladen\./);
  assert.doesNotMatch(m.text, /Bemerkung|Verwaltung:/);
  assert.equal(m.anhaenge.length, 1);
  await istPdf(m.anhaenge[0].inhalt);
});

test("Angebot angenommen: Betreff mit Paket, Firma und Name, PDF der Anfrage", async () => {
  const m = await anfrageMail({
    marke: "Elevaris",
    kontaktEmail: "info@liftvergleich.ch",
    logo,
    firma: "Limmat Lift GmbH",
    stufe: "standard",
    preisProJahrChf: 4300,
    vertragsdauerJahre: 3,
    kuendigungsfristMonate: 6,
    gebuehrChf: 160,
    kunde: { ...KUNDE, telefon: "", firma: "Verwaltung Muster AG", rechnungsadresse: "Muster AG\nPostfach\n8001 Zürich" },
    anlage: ANLAGE,
    angenommenAm: new Date("2026-11-24T23:30:00Z"),
    verwaltungUrl: "https://example.ch/admin?bereich=anfragen",
  });
  assert.equal(m.betreff, "Angebot angenommen: Standard bei Limmat Lift GmbH – Sandra Keller");
  assert.match(m.text, /Preis pro Jahr: CHF 4.300 exkl\. MWST/);
  assert.match(m.text, /Vertragsdauer: 3 Jahre, Kündigungsfrist 6 Monate/);
  assert.match(m.text, /Vermittlungsgebühr: CHF 160 exkl\. MWST, nur wenn der Vertrag zustande kommt/);
  assert.doesNotMatch(m.text, /Telefon/, "leere Angaben werden weggelassen");
  assert.match(m.text, /Firma oder Verwaltung: Verwaltung Muster AG/);
  assert.match(m.text, /Rechnungsadresse: Muster AG, Postfach, 8001 Zürich/);
  // 23:30 UTC ist in Zürich schon der nächste Tag
  assert.deepEqual(m.anhaenge.map((a) => a.dateiname), ["Anfrage 2026-11-25 Limmat Lift GmbH Sandra Keller.pdf"]);
  await istPdf(m.anhaenge[0].inhalt);
});

test("Angebot ohne Vertragsdauer: «nicht angegeben»", async () => {
  const m = await anfrageMail({
    marke: "Elevaris",
    kontaktEmail: "info@liftvergleich.ch",
    firma: "Alpen Aufzüge AG",
    stufe: "basis",
    preisProJahrChf: 1450,
    gebuehrChf: 160,
    kunde: KUNDE,
    anlage: ANLAGE,
    angenommenAm: new Date("2026-11-24T10:00:00Z"),
    verwaltungUrl: null,
  });
  assert.match(m.text, /Vertragsdauer: nicht angegeben/);
});

test("Hilfen: Dateiname, Zeitpunkt, Franken und Anlagezeilen", () => {
  assert.equal(pdfDateiname("Anfrage", "2026-11-24", "A/B: Lift", 'Name "X"'), "Anfrage 2026-11-24 A-B- Lift Name -X-.pdf");
  assert.equal(zeitpunktText(new Date("2026-11-24T15:30:00Z")), "24.11.2026, 16:30 Uhr");
  assert.equal(chfPdf(12500), "CHF 12'500");
  const zeilen = Object.fromEntries(anlageZeilen(ANLAGE));
  assert.equal(zeilen.Antrieb, "Seil");
  assert.equal(zeilen.Attika, "Ja");
  assert.equal(zeilen.Sicherheitsdispositiv, "Ja");
  assert.equal(zeilen.Baujahr, undefined, "fehlende Angaben werden weggelassen");
});

test("Passwort vergessen: Mail mit Link, Gültigkeit und Hinweis", () => {
  const m = passwortMail({ marke: "Elevaris", firma: "Limmat Lift GmbH", url: "https://example.ch/partner/passwort/neu?t=abc", gueltig: "1 Stunde" });
  assert.equal(m.betreff, "Elevaris: Passwort zurücksetzen");
  assert.match(m.text, /Konto «Limmat Lift GmbH»/);
  assert.match(m.text, /\nhttps:\/\/example\.ch\/partner\/passwort\/neu\?t=abc\n/);
  assert.match(m.text, /gilt 1 Stunde und funktioniert nur einmal/);
  assert.equal(m.anhaenge.length, 0);
});
