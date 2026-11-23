import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { berichtErstellen, pdfText } from "./bericht.ts";
import { leereCheckliste } from "./checkliste.ts";

test("Sonderzeichen: Umlaute bleiben, Unbekanntes wird ersetzt statt abzubrechen", () => {
  assert.equal(pdfText("Grösse „gut“ – Lüthi"), "Grösse „gut“ – Lüthi");
  assert.equal(pdfText("Čapek 😀 →"), "Capek ? ?");
  assert.equal(pdfText("Łódź"), "?ódz");
});

test("Bericht: PDF mit Angaben, Link, Unterschrift und Fotoseite", async () => {
  const jpg = readFileSync(new URL("../public/bilder/antrieb-seil.jpg", import.meta.url));
  const logo = readFileSync(new URL("../public/logo/elevaris-logo-v2.png", import.meta.url));
  const d = leereCheckliste(1, "Sandra Keller");
  Object.assign(d.aufzuege[0], { antrieb: "seil", haltestellen: "6", hersteller: "Schindler", baujahr: "1998" });
  d.aufzuege[0].zustand.kabine = "gut";
  d.aufzuege[0].zustandNotiz.tueren = "Türe 3. OG schleift 😀";
  d.wartung.kostenChf = "2480";
  d.abschluss.empfehlung = "standard";
  d.abschluss.schritte.vergleichen = true;
  // 1×1 Pixel PNG
  d.abschluss.unterschrift =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  d.fotos = Array.from({ length: 5 }, (_, i) => ({ id: `f${i}`, aufzug: "a1", stelle: i % 2 ? "grube" : "kabine", notiz: `Notiz ${i}` }));
  d.fotos.push({ id: "fehlt", aufzug: "a1", stelle: "weitere", notiz: "" });

  const pdf = await berichtErstellen({
    marke: "Elevaris",
    kontaktEmail: "info@liftvergleich.ch",
    berater: "Dario Springer",
    kunde: { name: "Sandra Keller", email: "s.keller@example.ch", telefon: "079 456 78 90", adresse: "Hohlstrasse 120, 8004 Zürich" },
    termin: "Mittwoch, 25. November 2026, 09:00–10:00 Uhr",
    daten: d,
    bilder: new Map(d.fotos.filter((f) => f.id !== "fehlt").map((f) => [f.id, jpg])),
    logo,
    angeboteUrl: "https://example.ch/angebote?plz=8004&halte=6",
    erstelltAm: new Date("2026-11-25T10:00:00Z"),
  });
  assert.equal(Buffer.from(pdf.slice(0, 4)).toString(), "%PDF");
  const doc = await PDFDocument.load(pdf);
  assert.ok(doc.getPageCount() >= 2, "Fotos auf eigener Seite");
  assert.equal(doc.getTitle(), "Bericht Beratung vor Ort – Sandra Keller");
  const links: string[] = [];
  for (const p of doc.getPages()) {
    const annots = p.node.Annots();
    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const aktion = annots!.lookup(i, PDFDict).lookup(PDFName.of("A"), PDFDict);
      links.push(aktion.lookup(PDFName.of("URI"), PDFString).decodeText());
    }
  }
  assert.deepEqual(links, ["https://example.ch/angebote?plz=8004&halte=6"], "anklickbarer Link zu den Angeboten");
});

test("Bericht ohne Logo, ohne Fotos und ohne Angaben bricht nicht ab", async () => {
  const pdf = await berichtErstellen({
    marke: "Elevaris",
    kontaktEmail: "info@liftvergleich.ch",
    berater: "Dario Springer",
    kunde: { name: "Peter", email: "p@example.ch", telefon: "", adresse: "" },
    termin: null,
    daten: leereCheckliste(1),
    bilder: new Map(),
  });
  assert.equal((await PDFDocument.load(pdf)).getPageCount(), 1);
});
