// Checkliste für die Beratung vor Ort (Inhalt von Dario bestätigt, 23.11.2026).
// Die Daten liegen als ein JSON-Objekt in der Datenbank. Fotos werden separat gespeichert
// und hier nur mit ihrer Kennung, der Foto-Stelle und einer Notiz aufgeführt.

import type { Anlage, Antrieb, JaNeinUnbekannt } from "./pricing.ts";
import { AUFZUGSARTEN, GEBAEUDETYPEN } from "./stammdaten.ts";

export type JaNein = "" | "ja" | "nein";
export type Bewertung = "" | "gut" | "mittel" | "schlecht";
export type Wichtig = "" | "wichtig" | "egal";
export type Paket = "basis" | "standard" | "komplett";

/** Höchstens so viele Fotos pro Beratung (Dario: mehr als 30 macht er bei einem Besuch nicht). */
export const FOTOS_MAX = 30;
export const AUFZUEGE_MAX = 10;

export const ROLLEN = [
  { value: "eigentuemer", label: "Eigentümer" },
  { value: "verwaltung", label: "Verwaltung" },
  { value: "hauswart", label: "Hauswart" },
  { value: "stwe", label: "Stockwerkeigentümer" },
] as const;
export type Rolle = "" | (typeof ROLLEN)[number]["value"];

/** Foto-Stellen pro Aufzug, so wie Dario bei einem Anlagebesuch fotografiert (23.11.2026). */
export const FOTO_STELLEN = [
  { key: "tueren-aussen", label: "Schachttüren von aussen" },
  { key: "kabine", label: "Kabine innen" },
  { key: "grube", label: "Grube" },
  { key: "schachtkopf", label: "Schachtkopf" },
  { key: "tueren-innen", label: "Schachttüren von innen" },
  { key: "antrieb", label: "Umlenkrollen oder Antrieb" },
  { key: "maschinenraum", label: "Maschinenraum" },
  { key: "notruf", label: "Notruftelefon (GSM)" },
  { key: "weitere", label: "Weitere Fotos, z. B. Typenschild oder Mängel" },
] as const;
export type FotoStelle = (typeof FOTO_STELLEN)[number]["key"];

/** Sichtprüfung: pro Punkt gut, mittel oder schlecht, dazu eine Bemerkung. */
export const ZUSTAND_PUNKTE = [
  { key: "kabine", label: "Kabine", hinweis: "Wände, Boden, Beleuchtung" },
  { key: "tueren", label: "Türen", hinweis: "Schliessen sauber, keine Schäden" },
  { key: "haltegenauigkeit", label: "Haltegenauigkeit", hinweis: "Kabine hält bündig mit dem Boden" },
  { key: "fahrkomfort", label: "Fahrkomfort", hinweis: "Geräusche, Ruckeln" },
  { key: "maschinenraum", label: "Maschinenraum", hinweis: "Sauber, frei zugänglich, beleuchtet" },
] as const;
export type ZustandPunkt = (typeof ZUSTAND_PUNKTE)[number]["key"];

export const BEWERTUNG_TEXT: Record<Exclude<Bewertung, "">, string> = { gut: "Gut", mittel: "Mittel", schlecht: "Schlecht" };
export const PAKET_TEXT: Record<Paket, string> = { basis: "Basis", standard: "Standard", komplett: "Komplett" };

export interface Foto {
  /** Kennung, die das Handy vergibt (damit ein Foto ohne Empfang doppelt gesendet werden darf). */
  id: string;
  /** Kennung des Aufzugs, zu dem das Foto gehört. */
  aufzug: string;
  stelle: FotoStelle;
  notiz: string;
}

export interface AufzugCheck {
  id: string;
  bezeichnung: string;
  hersteller: string;
  baujahr: string;
  fabriknummer: string;
  aufzugsart: string;
  antrieb: "" | Antrieb;
  maschinenraum: "" | "mit" | "ohne";
  traglastKg: string;
  personen: string;
  geschwindigkeit: string;
  haltestellen: string;
  zugaenge: string;
  tueren: "" | "schiebe" | "dreh";
  kabinenabschlusstueren: JaNein;
  brandfall: "" | JaNeinUnbekannt;
  /** Sicherheitsdispositiv (Wunsch Dario 23.11.2026: „sehr wichtiger Punkt“). */
  sicherheitsdispositiv: "" | JaNeinUnbekannt;
  notruf: JaNein;
  notrufVerbunden: string;
  zustand: Record<ZustandPunkt, Bewertung>;
  zustandNotiz: Record<ZustandPunkt, string>;
  notrufGetestet: JaNein;
  oelverlust: JaNein;
}

export interface ChecklisteDaten {
  kontakt: { ansprechperson: string; ansprechTelefon: string; rolle: Rolle };
  liegenschaft: { gebaeudetyp: string; stockwerke: string; attika: JaNein; schluessel: string };
  aufzuege: AufzugCheck[];
  wartung: {
    firma: string;
    kostenChf: string;
    wartungenProJahr: string;
    pikett24h: JaNein;
    vertragsbeginn: string;
    laufzeit: string;
    kuendigungsfrist: string;
    kuendigungstermin: string;
    letzteWartung: string;
    letzteKontrolle: string;
    offeneMaengel: string;
    stoerungenProJahr: string;
    zufriedenheit: number;
    zufriedenheitNotiz: string;
  };
  wuensche: {
    paket: "" | Paket | "offen";
    pikett: Wichtig;
    reaktion: Wichtig;
    preis: Wichtig;
    modernisierung: "" | "ja" | "nein" | "unklar";
    weitere: string;
  };
  abschluss: {
    empfehlung: "" | Paket;
    begruendung: string;
    schritte: { vergleichen: boolean; kuendigen: boolean; kontrollbericht: boolean };
    berichtPerMail: JaNein;
    /** Unterschrift des Kunden als PNG (data:image/png;base64,…) oder leer. */
    unterschrift: string;
    unterschriftName: string;
    /** Zeitpunkt „Beratung abschliessen“ (ISO) oder leer. */
    abgeschlossenAm: string;
  };
  fotos: Foto[];
}

const ZUSTAND_LEER = (): Record<ZustandPunkt, Bewertung> =>
  ({ kabine: "", tueren: "", haltegenauigkeit: "", fahrkomfort: "", maschinenraum: "" });
const NOTIZ_LEER = (): Record<ZustandPunkt, string> =>
  ({ kabine: "", tueren: "", haltegenauigkeit: "", fahrkomfort: "", maschinenraum: "" });

export function leererAufzug(id: string, nummer: number): AufzugCheck {
  return {
    id,
    bezeichnung: `Aufzug ${nummer}`,
    hersteller: "unbekannt",
    baujahr: "",
    fabriknummer: "",
    aufzugsart: "",
    antrieb: "",
    maschinenraum: "",
    traglastKg: "",
    personen: "",
    geschwindigkeit: "",
    haltestellen: "",
    zugaenge: "",
    tueren: "",
    kabinenabschlusstueren: "",
    brandfall: "",
    sicherheitsdispositiv: "",
    notruf: "",
    notrufVerbunden: "",
    zustand: ZUSTAND_LEER(),
    zustandNotiz: NOTIZ_LEER(),
    notrufGetestet: "",
    oelverlust: "",
  };
}

/** Leere Checkliste mit so vielen Aufzügen, wie der Kunde bei der Buchung angegeben hat. */
export function leereCheckliste(anzahlAufzuege: number, kundeName = ""): ChecklisteDaten {
  const n = Math.min(AUFZUEGE_MAX, Math.max(1, Math.trunc(anzahlAufzuege) || 1));
  return {
    kontakt: { ansprechperson: "", ansprechTelefon: "", rolle: "" },
    liegenschaft: { gebaeudetyp: "", stockwerke: "", attika: "", schluessel: "" },
    aufzuege: Array.from({ length: n }, (_, i) => leererAufzug(`a${i + 1}`, i + 1)),
    wartung: {
      firma: "unbekannt",
      kostenChf: "",
      wartungenProJahr: "",
      pikett24h: "",
      vertragsbeginn: "",
      laufzeit: "",
      kuendigungsfrist: "",
      kuendigungstermin: "",
      letzteWartung: "",
      letzteKontrolle: "",
      offeneMaengel: "",
      stoerungenProJahr: "",
      zufriedenheit: 0,
      zufriedenheitNotiz: "",
    },
    wuensche: { paket: "", pikett: "", reaktion: "", preis: "", modernisierung: "", weitere: "" },
    abschluss: {
      empfehlung: "",
      begruendung: "",
      schritte: { vergleichen: false, kuendigen: false, kontrollbericht: false },
      berichtPerMail: "",
      unterschrift: "",
      unterschriftName: kundeName,
      abgeschlossenAm: "",
    },
    fotos: [],
  };
}

// ---------------------------------------------------------------------------
// Bereinigen: Alles, was vom Handy kommt, wird gegen die Vorlage geprüft.
// Unbekannte Felder fallen weg, Texte werden gekürzt, Auswahlfelder müssen gültig sein.

const KURZ = 200;
const LANG = 2000;
const UNTERSCHRIFT_MAX = 300_000;
const ID_MUSTER = /^[A-Za-z0-9_-]{1,64}$/;

/** Erlaubte Werte der Auswahlfelder, nach Pfad (ohne Listen-Index). */
const AUSWAHL: Record<string, readonly string[]> = {
  "kontakt.rolle": ["", ...ROLLEN.map((r) => r.value)],
  "liegenschaft.gebaeudetyp": ["", ...GEBAEUDETYPEN],
  "liegenschaft.attika": ["", "ja", "nein"],
  "aufzuege.aufzugsart": ["", ...AUFZUGSARTEN],
  "aufzuege.antrieb": ["", "seil", "hydraulik", "unbekannt"],
  "aufzuege.maschinenraum": ["", "mit", "ohne"],
  "aufzuege.tueren": ["", "schiebe", "dreh"],
  "aufzuege.kabinenabschlusstueren": ["", "ja", "nein"],
  "aufzuege.brandfall": ["", "ja", "nein", "unbekannt"],
  "aufzuege.sicherheitsdispositiv": ["", "ja", "nein", "unbekannt"],
  "aufzuege.notruf": ["", "ja", "nein"],
  "aufzuege.notrufGetestet": ["", "ja", "nein"],
  "aufzuege.oelverlust": ["", "ja", "nein"],
  "wartung.pikett24h": ["", "ja", "nein"],
  "wuensche.paket": ["", "basis", "standard", "komplett", "offen"],
  "wuensche.pikett": ["", "wichtig", "egal"],
  "wuensche.reaktion": ["", "wichtig", "egal"],
  "wuensche.preis": ["", "wichtig", "egal"],
  "wuensche.modernisierung": ["", "ja", "nein", "unklar"],
  "abschluss.empfehlung": ["", "basis", "standard", "komplett"],
  "abschluss.berichtPerMail": ["", "ja", "nein"],
};
for (const p of ZUSTAND_PUNKTE) AUSWAHL[`aufzuege.zustand.${p.key}`] = ["", "gut", "mittel", "schlecht"];

const LANGE_TEXTE = new Set([
  "wartung.offeneMaengel",
  "wartung.zufriedenheitNotiz",
  "wuensche.weitere",
  "abschluss.begruendung",
  ...ZUSTAND_PUNKTE.map((p) => `aufzuege.zustandNotiz.${p.key}`),
]);

const istObjekt = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function text(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // Steuerzeichen weg, ausser Zeilenumbruch
  return v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").slice(0, max);
}

function nachVorlage<T>(vorlage: T, roh: unknown, pfad: string): T {
  if (typeof vorlage === "string") {
    const erlaubt = AUSWAHL[pfad];
    const t = text(roh, LANGE_TEXTE.has(pfad) ? LANG : KURZ);
    if (erlaubt) return (erlaubt.includes(t) ? t : vorlage) as T;
    return t as T;
  }
  if (typeof vorlage === "boolean") return (roh === true) as T;
  if (typeof vorlage === "number") return (typeof roh === "number" && Number.isFinite(roh) ? roh : vorlage) as T;
  if (istObjekt(vorlage)) {
    const quelle = istObjekt(roh) ? roh : {};
    const aus: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(vorlage)) aus[k] = nachVorlage(v, quelle[k], pfad ? `${pfad}.${k}` : k);
    return aus as T;
  }
  return vorlage;
}

export function checklisteBereinigen(roh: unknown, anzahlAufzuege = 1): ChecklisteDaten {
  const leer = leereCheckliste(anzahlAufzuege);
  const quelle = istObjekt(roh) ? roh : {};
  const d = nachVorlage<ChecklisteDaten>({ ...leer, aufzuege: [], fotos: [] }, quelle, "");

  const aufzuegeRoh = Array.isArray(quelle.aufzuege) ? quelle.aufzuege.slice(0, AUFZUEGE_MAX) : [];
  const ids = new Set<string>();
  d.aufzuege = [];
  for (const a of aufzuegeRoh) {
    const id = istObjekt(a) && typeof a.id === "string" && ID_MUSTER.test(a.id) ? a.id : "";
    if (!id || ids.has(id)) continue;
    ids.add(id);
    d.aufzuege.push({ ...nachVorlage(leererAufzug(id, d.aufzuege.length + 1), a, "aufzuege"), id });
  }
  if (d.aufzuege.length === 0) d.aufzuege = leer.aufzuege;
  for (const a of d.aufzuege) if (!a.hersteller.trim()) a.hersteller = "unbekannt";
  if (!d.wartung.firma.trim()) d.wartung.firma = "unbekannt";

  const z = d.wartung.zufriedenheit;
  d.wartung.zufriedenheit = Number.isInteger(z) && z >= 0 && z <= 5 ? z : 0;

  const fotosRoh = Array.isArray(quelle.fotos) ? quelle.fotos : [];
  const stellen = FOTO_STELLEN.map((s) => s.key as string);
  const fotoIds = new Set<string>();
  d.fotos = [];
  for (const f of fotosRoh) {
    if (d.fotos.length >= FOTOS_MAX) break;
    if (!istObjekt(f)) continue;
    const id = typeof f.id === "string" && ID_MUSTER.test(f.id) ? f.id : "";
    if (!id || fotoIds.has(id) || typeof f.aufzug !== "string" || !ids.has(f.aufzug)) continue;
    if (typeof f.stelle !== "string" || !stellen.includes(f.stelle)) continue;
    fotoIds.add(id);
    d.fotos.push({ id, aufzug: f.aufzug, stelle: f.stelle as FotoStelle, notiz: text(f.notiz, KURZ) });
  }

  const sig = istObjekt(quelle.abschluss) ? quelle.abschluss.unterschrift : "";
  d.abschluss.unterschrift =
    typeof sig === "string" && sig.length <= UNTERSCHRIFT_MAX && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(sig) ? sig : "";

  const am = d.abschluss.abgeschlossenAm;
  d.abschluss.abgeschlossenAm = am && !Number.isNaN(Date.parse(am)) ? new Date(am).toISOString() : "";
  if (pflichtFehler(d).length > 0) d.abschluss.abgeschlossenAm = "";
  return d;
}

// ---------------------------------------------------------------------------

const ganzzahl = (s: string): number | undefined => {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return undefined;
  return Number(t);
};
const zahl = (s: string): number | undefined => {
  const t = s.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
};

/** Pflichtangaben, ohne die keine Angebote verglichen werden können (Entscheid Dario, 23.11.2026). */
export function pflichtFehler(d: ChecklisteDaten): string[] {
  const fehler: string[] = [];
  for (const a of d.aufzuege) {
    const name = a.bezeichnung.trim() || "Aufzug";
    if (!a.hersteller.trim()) fehler.push(`${name}: Hersteller fehlt`);
    if (!a.antrieb) fehler.push(`${name}: Antrieb fehlt`);
    const h = ganzzahl(a.haltestellen);
    if (h === undefined || h < 2 || h > 100) fehler.push(`${name}: Anzahl Haltestellen fehlt`);
  }
  return fehler;
}

/** Postleitzahl aus einer Adresse wie „Seestrasse 12, 8004 Zürich“. */
export function plzAusAdresse(adresse: string): string | null {
  const treffer = adresse.match(/\b\d{4}\b/g);
  return treffer ? treffer[treffer.length - 1] : null;
}

/** Anlage für den Angebotsvergleich, aus dem ersten Aufzug der Checkliste. */
export function anlageAusCheckliste(d: ChecklisteDaten, adresse: string): Anlage | null {
  const a = d.aufzuege[0];
  const plz = plzAusAdresse(adresse);
  const halte = a ? ganzzahl(a.haltestellen) : undefined;
  if (!a || !a.antrieb || !plz || halte === undefined || halte < 2) return null;
  const baujahr = ganzzahl(a.baujahr);
  return {
    gebaeudetyp: d.liegenschaft.gebaeudetyp || "Mehrfamilienhaus",
    plz,
    anzahlAufzuege: d.aufzuege.length,
    aufzugsart: a.aufzugsart || "Personenaufzug",
    antrieb: a.antrieb,
    hersteller: a.hersteller.trim() || "unbekannt",
    haltestellen: halte,
    brandfallsteuerung: a.brandfall || "unbekannt",
    attika: d.liegenschaft.attika || undefined,
    sicherheitsdispositiv: a.sicherheitsdispositiv || "unbekannt",
    baujahr: baujahr && baujahr > 1900 && baujahr < 2100 ? baujahr : undefined,
    traglastKg: ganzzahl(a.traglastKg),
    geschwindigkeitMs: zahl(a.geschwindigkeit),
  };
}
