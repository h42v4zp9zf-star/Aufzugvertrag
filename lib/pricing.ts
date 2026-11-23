// Vergleichslogik: berechnet aus den Preismodellen der Liftfirmen
// feste Jahrespreise für eine Kundenanlage und rangiert sie pro Stufe.
import { herstellerGruppe } from "./stammdaten.ts";

export type Stufe = "basis" | "standard" | "komplett";
export type Antrieb = "seil" | "hydraulik" | "unbekannt";
export type JaNeinUnbekannt = "ja" | "nein" | "unbekannt";
export type OptionKey = "fernueberwachung" | "verfuegbarkeit" | "ausserhalb";

export const STUFEN: Stufe[] = ["basis", "standard", "komplett"];

export const VERMITTLUNGSGEBUEHR_CHF = 160;

export interface Anlage {
  gebaeudetyp: string;
  plz: string;
  anzahlAufzuege: number;
  aufzugsart: string;
  antrieb: Antrieb;
  hersteller: string;
  haltestellen: number;
  brandfallsteuerung: JaNeinUnbekannt;
  /** Attika vorhanden (Wunsch Dario, 23.11.2026). Bei älteren Anfragen fehlt die Angabe. */
  attika?: "ja" | "nein";
  /** Sicherheitsdispositiv vorhanden (Wunsch Dario, 23.11.2026): mehr Aufwand bei der Wartung.
   *  Bei älteren Anfragen fehlt die Angabe. */
  sicherheitsdispositiv?: JaNeinUnbekannt;
  baujahr?: number;
  kabinenabschlusstueren?: number;
  traglastKg?: number;
  geschwindigkeitMs?: number;
}

// Anzahl Wartungen pro Jahr ist pro Paket fix vorgegeben (Entscheid Dario, 20.11.2026),
// damit die Pakete aller Liftfirmen vergleichbar sind.
export const WARTUNGEN_PRO_STUFE: Record<Stufe, number> = { basis: 2, standard: 4, komplett: 6 };

// Pikett-Deckung (Zeiten des Störungsdienstes), wählt die Liftfirma pro Paket (Wunsch Dario, 22.11.2026).
export type Pikett = "24h" | "tag" | "keine";
export const PIKETT: Pikett[] = ["24h", "tag", "keine"];
export const PIKETT_TEXT: Record<Pikett, string> = {
  "24h": "24 Stunden",
  tag: "7–17 Uhr",
  keine: "Keine Pikett-Deckung",
};
// Für Pakete, die vor dieser Angabe gespeichert wurden (bisherige Paketbeschreibung).
export const PIKETT_STANDARD: Record<Stufe, Pikett> = { basis: "keine", standard: "24h", komplett: "24h" };
const PIKETT_WERT: Record<Pikett, number> = { "24h": 1, tag: 0.5, keine: 0 };

/** Auswahl im Preisformular: Vertragsdauer in Jahren und Kündigungsfrist in Monaten. */
export const VERTRAGSDAUER_JAHRE = [1, 2, 3, 4, 5];
export const KUENDIGUNGSFRIST_MONATE = [1, 3, 6, 12];

export function dauerText(jahre: number): string {
  return jahre === 1 ? "1 Jahr" : `${jahre} Jahre`;
}
export function fristText(monate: number): string {
  return monate === 1 ? "1 Monat" : `${monate} Monate`;
}
/** z. B. «3 Jahre, Kündigungsfrist 6 Monate»; ohne Angabe «Dauer nicht angegeben». */
export function laufzeitText(p: { vertragsdauerJahre?: number; kuendigungsfristMonate?: number }): string {
  if (!p.vertragsdauerJahre) return "Dauer nicht angegeben";
  const dauer = dauerText(p.vertragsdauerJahre);
  return p.kuendigungsfristMonate ? `${dauer}, Kündigungsfrist ${fristText(p.kuendigungsfristMonate)}` : dauer;
}

export interface Paket {
  stufe: Stufe;
  grundpreisChf: number; // pro Aufzug und Jahr
  reaktionszeitStd: number;
  pikett: Pikett;
  /** Vertragsdauer und Kündigungsfrist (Wunsch Dario, 23.11.2026). Fehlen bei älteren Preismodellen. */
  vertragsdauerJahre?: number;
  kuendigungsfristMonate?: number;
}

// Was eine Liftfirma im Portal erfasst (ohne Name und Bewertung).
export type PreismodellDaten = Omit<Preismodell, "firma" | "firmaId" | "bewertung">;

export interface Preismodell {
  firma: string;
  firmaId?: number; // gesetzt bei Preismodellen aus der Datenbank
  plzPraefixe: string[]; // Einzugsgebiet, z. B. ["8", "9"]
  hersteller: string[] | "alle";
  antriebe: Antrieb[];
  pakete: Paket[];
  zuschlaege: {
    proHaltestelleUeber4Chf: number;
    hydraulikChf: number;
    alterUeber25JahreChf: number;
    brandfallsteuerungChf: number;
    proKabinenabschlusstuerChf: number;
    /** Zuschlag bei Sicherheitsdispositiv (Wunsch Dario, 23.11.2026). Ältere Preismodelle: 0. */
    sicherheitsdispositivChf: number;
  };
  optionen: Record<OptionKey, number | null>; // null = nicht angeboten
  bewertung: number; // 1 bis 5
}

/** Bezeichnungen der Zuschläge, wie die Liftfirmen sie im Preisformular sehen. */
export const ZUSCHLAG_TEXT: Record<keyof Preismodell["zuschlaege"], string> = {
  proHaltestelleUeber4Chf: "Pro Haltestelle über 4",
  hydraulikChf: "Hydraulikantrieb",
  alterUeber25JahreChf: "Anlage älter als 25 Jahre",
  brandfallsteuerungChf: "Brandfallsteuerung vorhanden",
  proKabinenabschlusstuerChf: "Pro zusätzliche Kabinenabschlusstür",
  sicherheitsdispositivChf: "Sicherheitsdispositiv vorhanden",
};

export interface Angebot {
  firma: string;
  firmaId?: number;
  stufe: Stufe;
  preisProJahrChf: number;
  wartungenProJahr: number;
  reaktionszeitStd: number;
  pikett: Pikett;
  vertragsdauerJahre?: number;
  kuendigungsfristMonate?: number;
  bewertung: number;
  score: number;
}

const AKTUELLES_JAHR = 2026;

export function deckt(modell: Preismodell, anlage: Anlage): boolean {
  const imGebiet = modell.plzPraefixe.some((p) => anlage.plz.trim().startsWith(p));
  const hersteller = herstellerGruppe(anlage.hersteller);
  const herstellerOk = modell.hersteller === "alle" || hersteller === "unbekannt" || modell.hersteller.includes(hersteller);
  const antriebOk = anlage.antrieb === "unbekannt" || modell.antriebe.includes(anlage.antrieb);
  return imGebiet && herstellerOk && antriebOk;
}

export function preisProAufzug(
  modell: Preismodell,
  paket: Paket,
  anlage: Anlage,
  optionen: OptionKey[],
): number | null {
  const z = modell.zuschlaege;
  let preis = paket.grundpreisChf;
  preis += Math.max(0, anlage.haltestellen - 4) * z.proHaltestelleUeber4Chf;
  if (anlage.antrieb === "hydraulik") preis += z.hydraulikChf;
  if (anlage.baujahr && AKTUELLES_JAHR - anlage.baujahr > 25) preis += z.alterUeber25JahreChf;
  if (anlage.brandfallsteuerung === "ja") preis += z.brandfallsteuerungChf;
  if (anlage.sicherheitsdispositiv === "ja") preis += z.sicherheitsdispositivChf ?? 0;
  preis += (anlage.kabinenabschlusstueren ?? 0) * z.proKabinenabschlusstuerChf;
  for (const o of optionen) {
    const p = modell.optionen[o];
    if (p === null) return null; // Option nicht angeboten → Angebot fällt weg
    preis += p;
  }
  return preis;
}

// Gewichtung laut Konzept: 60 % Preis, 25 % Service (Reaktionszeit und Pikett-Deckung), 15 % Bewertung.
export function vergleiche(
  anlage: Anlage,
  modelle: Preismodell[],
  optionen: OptionKey[] = [],
): Record<Stufe, Angebot[]> {
  const result = { basis: [], standard: [], komplett: [] } as Record<Stufe, Angebot[]>;
  const anzahl = Math.max(1, anlage.anzahlAufzuege);

  for (const stufe of STUFEN) {
    const roh: Omit<Angebot, "score">[] = [];
    for (const m of modelle) {
      if (!deckt(m, anlage)) continue;
      const paket = m.pakete.find((p) => p.stufe === stufe);
      if (!paket) continue;
      const proAufzug = preisProAufzug(m, paket, anlage, optionen);
      if (proAufzug === null) continue;
      roh.push({
        firma: m.firma,
        firmaId: m.firmaId,
        stufe,
        preisProJahrChf: Math.round(proAufzug * anzahl),
        wartungenProJahr: WARTUNGEN_PRO_STUFE[stufe],
        reaktionszeitStd: paket.reaktionszeitStd,
        pikett: paket.pikett ?? PIKETT_STANDARD[stufe],
        vertragsdauerJahre: paket.vertragsdauerJahre,
        kuendigungsfristMonate: paket.kuendigungsfristMonate,
        bewertung: m.bewertung,
      });
    }
    if (roh.length === 0) continue;
    const minPreis = Math.min(...roh.map((a) => a.preisProJahrChf));
    const minReaktion = Math.min(...roh.map((a) => a.reaktionszeitStd));
    const maxPikett = Math.max(...roh.map((a) => PIKETT_WERT[a.pikett]));
    result[stufe] = roh
      .map((a) => {
        const preisScore = minPreis / a.preisProJahrChf;
        // Wartungen sind pro Stufe gleich; beim Service zählen Reaktionszeit und Pikett-Deckung je zur Hälfte.
        const pikettScore = maxPikett > 0 ? PIKETT_WERT[a.pikett] / maxPikett : 1;
        const serviceScore = (minReaktion / a.reaktionszeitStd + pikettScore) / 2;
        const score = 0.6 * preisScore + 0.25 * serviceScore + 0.15 * (a.bewertung / 5);
        return { ...a, score: Math.round(score * 1000) / 1000 };
      })
      .sort((a, b) => b.score - a.score);
  }
  return result;
}

export function chf(betrag: number): string {
  return "CHF " + betrag.toLocaleString("de-CH").replace(/,/g, "'");
}
