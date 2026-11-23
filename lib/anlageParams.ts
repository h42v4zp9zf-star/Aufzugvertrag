// Die Anlage wird in der URL übergeben: Der Kunde braucht kein Konto,
// und der Link zum Vergleich lässt sich später per E-Mail verschicken.
import type { Anlage, Antrieb, JaNeinUnbekannt } from "./pricing.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

export function toParams(a: Anlage): URLSearchParams {
  const p = new URLSearchParams();
  p.set("gebaeude", a.gebaeudetyp);
  p.set("plz", a.plz);
  p.set("anzahl", String(a.anzahlAufzuege));
  p.set("art", a.aufzugsart);
  p.set("antrieb", a.antrieb);
  p.set("hersteller", a.hersteller);
  p.set("halte", String(a.haltestellen));
  p.set("brandfall", a.brandfallsteuerung);
  if (a.attika) p.set("attika", a.attika);
  if (a.baujahr !== undefined) p.set("baujahr", String(a.baujahr));
  if (a.kabinenabschlusstueren !== undefined) p.set("tueren", String(a.kabinenabschlusstueren));
  if (a.traglastKg !== undefined) p.set("traglast", String(a.traglastKg));
  if (a.geschwindigkeitMs !== undefined) p.set("v", String(a.geschwindigkeitMs));
  return p;
}

export function fromParams(p: URLSearchParams): Anlage | null {
  const plz = p.get("plz");
  const halte = num(p.get("halte"));
  if (!plz || !halte) return null;
  return {
    gebaeudetyp: p.get("gebaeude") ?? "Mehrfamilienhaus",
    plz,
    anzahlAufzuege: Math.max(1, num(p.get("anzahl")) ?? 1),
    aufzugsart: p.get("art") ?? "Personenaufzug",
    antrieb: oneOf<Antrieb>(p.get("antrieb"), ["seil", "hydraulik", "unbekannt"], "unbekannt"),
    hersteller: (p.get("hersteller") ?? "").trim().slice(0, 80) || "unbekannt",
    haltestellen: halte,
    brandfallsteuerung: oneOf<JaNeinUnbekannt>(p.get("brandfall"), ["ja", "nein", "unbekannt"], "unbekannt"),
    attika: p.get("attika") === "ja" ? "ja" : p.get("attika") === "nein" ? "nein" : undefined,
    baujahr: num(p.get("baujahr")),
    kabinenabschlusstueren: num(p.get("tueren")),
    traglastKg: num(p.get("traglast")),
    geschwindigkeitMs: num(p.get("v")),
  };
}
