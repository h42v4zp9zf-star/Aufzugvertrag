// Vergleichslogik: berechnet aus den Preismodellen der Liftfirmen
// feste Jahrespreise für eine Kundenanlage und rangiert sie pro Stufe.

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
  baujahr?: number;
  kabinenabschlusstueren?: number;
  traglastKg?: number;
  geschwindigkeitMs?: number;
}

export interface Paket {
  stufe: Stufe;
  grundpreisChf: number; // pro Aufzug und Jahr
  wartungenProJahr: number;
  reaktionszeitStd: number;
}

export interface Preismodell {
  firma: string;
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
  };
  optionen: Record<OptionKey, number | null>; // null = nicht angeboten
  bewertung: number; // 1 bis 5
}

export interface Angebot {
  firma: string;
  stufe: Stufe;
  preisProJahrChf: number;
  wartungenProJahr: number;
  reaktionszeitStd: number;
  bewertung: number;
  score: number;
}

const AKTUELLES_JAHR = 2026;

export function deckt(modell: Preismodell, anlage: Anlage): boolean {
  const imGebiet = modell.plzPraefixe.some((p) => anlage.plz.trim().startsWith(p));
  const herstellerOk =
    modell.hersteller === "alle" ||
    anlage.hersteller === "unbekannt" ||
    modell.hersteller.includes(anlage.hersteller);
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
  preis += (anlage.kabinenabschlusstueren ?? 0) * z.proKabinenabschlusstuerChf;
  for (const o of optionen) {
    const p = modell.optionen[o];
    if (p === null) return null; // Option nicht angeboten → Angebot fällt weg
    preis += p;
  }
  return preis;
}

// Gewichtung laut Konzept: 60 % Preis, 25 % Servicewerte, 15 % Bewertung.
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
        stufe,
        preisProJahrChf: Math.round(proAufzug * anzahl),
        wartungenProJahr: paket.wartungenProJahr,
        reaktionszeitStd: paket.reaktionszeitStd,
        bewertung: m.bewertung,
      });
    }
    if (roh.length === 0) continue;
    const minPreis = Math.min(...roh.map((a) => a.preisProJahrChf));
    const maxWartungen = Math.max(...roh.map((a) => a.wartungenProJahr));
    const minReaktion = Math.min(...roh.map((a) => a.reaktionszeitStd));
    result[stufe] = roh
      .map((a) => {
        const preisScore = minPreis / a.preisProJahrChf;
        const serviceScore =
          (a.wartungenProJahr / maxWartungen + minReaktion / a.reaktionszeitStd) / 2;
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
