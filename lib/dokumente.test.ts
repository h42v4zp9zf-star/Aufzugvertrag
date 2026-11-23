import { test } from "node:test";
import assert from "node:assert/strict";
import { dokumentTyp, groesseText, sichererDateiname } from "./dokumente.ts";

const kopf = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);

test("Dateityp wird am Inhalt erkannt, nicht am Namen", () => {
  assert.equal(dokumentTyp(new TextEncoder().encode("%PDF-1.7\n")), "application/pdf");
  assert.equal(dokumentTyp(kopf(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(dokumentTyp(kopf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(dokumentTyp(new TextEncoder().encode("<html><script>")), null, "HTML wird abgelehnt");
  assert.equal(dokumentTyp(new TextEncoder().encode("PK\u0003\u0004")), null, "Word/ZIP wird abgelehnt");
  assert.equal(dokumentTyp(new Uint8Array()), null, "leere Datei");
});

test("Dateiname ohne Pfad, mit passender Endung", () => {
  assert.equal(sichererDateiname("Wartungsvertrag 2019.pdf", "application/pdf"), "Wartungsvertrag 2019.pdf");
  assert.equal(sichererDateiname("C:\\Users\\x\\Offerte.PDF", "application/pdf"), "Offerte.PDF");
  assert.equal(sichererDateiname("../../etc/passwd", "application/pdf"), "passwd.pdf");
  assert.equal(sichererDateiname("IMG_0042.jpeg", "image/jpeg"), "IMG_0042.jpeg");
  assert.equal(sichererDateiname("foto.heic", "image/jpeg"), "foto.heic.jpg");
  assert.equal(sichererDateiname("", "image/png"), "dokument.png");
  assert.equal(sichererDateiname('a"b\u0000c.pdf', "application/pdf"), "abc.pdf");
});

test("Grösse als Text", () => {
  assert.equal(groesseText(200), "1 KB");
  assert.equal(groesseText(340 * 1024), "340 KB");
  assert.equal(groesseText(1.25 * 1024 * 1024), "1,3 MB");
});
