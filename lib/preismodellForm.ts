// Liest und prüft das Preisformular einer Liftfirma.
import { STUFEN, type Antrieb, type Paket, type PreismodellDaten } from "./pricing.ts";

export interface FormLike {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
}

export interface FormErgebnis {
  daten: PreismodellDaten | null;
  veroeffentlicht: boolean;
  fehler: string[];
}

const GRENZEN = {
  grundpreis: [0, 100000],
  reaktion: [1, 168],
  zuschlag: [0, 10000],
} as const;

function zahl(form: FormLike, name: string, [min, max]: readonly [number, number], label: string, fehler: string[]): number {
  const roh = String(form.get(name) ?? "").trim().replace(/['’\s]/g, "").replace(",", ".");
  const n = Number(roh);
  if (roh === "" || !Number.isFinite(n)) {
    fehler.push(`${label}: bitte eine Zahl angeben.`);
    return 0;
  }
  if (n < min || n > max) {
    fehler.push(`${label}: Wert zwischen ${min} und ${max} angeben.`);
  }
  return n;
}

const an = (form: FormLike, name: string) => form.get(name) === "on";

export function leseFormular(form: FormLike): FormErgebnis {
  const fehler: string[] = [];

  const plzPraefixe = form.getAll("plz").map(String).filter((k) => /^[1-9]$/.test(k));
  if (plzPraefixe.length === 0) fehler.push("Einzugsgebiet: mindestens einen PLZ-Kreis wählen.");

  const herstellerAlle = an(form, "hersteller_alle");
  const herstellerListe = form.getAll("hersteller").map(String).filter(Boolean);
  if (!herstellerAlle && herstellerListe.length === 0) fehler.push("Hersteller: „Alle“ oder mindestens einen Hersteller wählen.");

  const antriebe: Antrieb[] = [];
  if (an(form, "antrieb_seil")) antriebe.push("seil");
  if (an(form, "antrieb_hydraulik")) antriebe.push("hydraulik");
  if (antriebe.length === 0) fehler.push("Antriebe: mindestens Seil oder Hydraulik wählen.");

  const pakete: Paket[] = [];
  for (const stufe of STUFEN) {
    if (!an(form, `${stufe}_angeboten`)) continue;
    const name = stufe[0].toUpperCase() + stufe.slice(1);
    pakete.push({
      stufe,
      grundpreisChf: Math.round(zahl(form, `${stufe}_grundpreis`, GRENZEN.grundpreis, `${name}: Grundpreis`, fehler)),
      reaktionszeitStd: zahl(form, `${stufe}_reaktion`, GRENZEN.reaktion, `${name}: Reaktionszeit`, fehler),
    });
  }
  if (pakete.length === 0) fehler.push("Pakete: mindestens ein Paket anbieten.");

  const zuschlaege = {
    proHaltestelleUeber4Chf: zahl(form, "z_halte", GRENZEN.zuschlag, "Zuschlag pro Haltestelle über 4", fehler),
    hydraulikChf: zahl(form, "z_hydraulik", GRENZEN.zuschlag, "Zuschlag Hydraulik", fehler),
    alterUeber25JahreChf: zahl(form, "z_alter", GRENZEN.zuschlag, "Zuschlag Anlage älter als 25 Jahre", fehler),
    brandfallsteuerungChf: zahl(form, "z_brandfall", GRENZEN.zuschlag, "Zuschlag Brandfallsteuerung", fehler),
    proKabinenabschlusstuerChf: zahl(form, "z_tuer", GRENZEN.zuschlag, "Zuschlag pro Kabinenabschlusstür", fehler),
  };

  const daten: PreismodellDaten = {
    plzPraefixe,
    hersteller: herstellerAlle ? "alle" : herstellerListe,
    antriebe,
    pakete,
    zuschlaege,
    optionen: { fernueberwachung: null, verfuegbarkeit: null, ausserhalb: null },
  };

  return { daten: fehler.length ? null : daten, veroeffentlicht: an(form, "veroeffentlicht"), fehler };
}
