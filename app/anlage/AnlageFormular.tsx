"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Header } from "@/components/Header";
import { toParams } from "@/lib/anlageParams";
import { HerstellerWahl } from "./HerstellerWahl";
import type { Anlage, Antrieb, JaNeinUnbekannt } from "@/lib/pricing";
import { AUFZUGSARTEN, GEBAEUDETYPEN } from "@/lib/stammdaten";

const ARTEN = AUFZUGSARTEN;
const ANTRIEBE: { value: Antrieb; label: string }[] = [
  { value: "seil", label: "Seil" },
  { value: "hydraulik", label: "Hydraulik" },
  { value: "unbekannt", label: "Unbekannt" },
];
// Foto passend zum gewählten Antrieb (Fotos von Dario, 23.11.2026).
const BILD: Record<Antrieb, { src: string; alt: string }> = {
  seil: { src: "/bilder/antrieb-seil.jpg", alt: "Seilantrieb mit gelber Treibscheibe im Aufzugsschacht" },
  hydraulik: { src: "/bilder/antrieb-hydraulik.jpg", alt: "Hydraulikaggregat mit roter Pumpe im Maschinenraum" },
  unbekannt: { src: "/bilder/antrieb-unbekannt.jpg", alt: "Blick in einen Aufzugsschacht mit Antrieb und Seilen" },
};
const ATTIKA: { value: "ja" | "nein"; label: string }[] = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
];
const BRANDFALL: { value: JaNeinUnbekannt; label: string }[] = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
  { value: "unbekannt", label: "Unbekannt" },
];

function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="choice"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </>
  );
}

const text = (v: number | undefined) => (v === undefined ? "" : String(v));

/**
 * Formular „Ihre Anlage“. `start` enthält die bisherigen Angaben, wenn der Kunde im Vergleich
 * auf „Angaben ändern“ klickt (Verbesserung Nr. 16): Dann bleibt alles ausgefüllt.
 */
export function AnlageFormular({ start }: { start: Anlage | null }) {
  const router = useRouter();
  const [gebaeudetyp, setGebaeudetyp] = useState(
    start && GEBAEUDETYPEN.includes(start.gebaeudetyp) ? start.gebaeudetyp : GEBAEUDETYPEN[0],
  );
  const [plz, setPlz] = useState(start?.plz ?? "");
  const [anzahl, setAnzahl] = useState(String(start?.anzahlAufzuege ?? 1));
  const [art, setArt] = useState(start && ARTEN.includes(start.aufzugsart) ? start.aufzugsart : ARTEN[0]);
  const [antrieb, setAntrieb] = useState<Antrieb>(start?.antrieb ?? "seil");
  const [hersteller, setHersteller] = useState(start?.hersteller ?? "unbekannt");
  const [halte, setHalte] = useState(text(start?.haltestellen));
  const [brandfall, setBrandfall] = useState<JaNeinUnbekannt>(start?.brandfallsteuerung ?? "unbekannt");
  const [attika, setAttika] = useState<"ja" | "nein" | null>(start?.attika ?? null);
  const [sicherheit, setSicherheit] = useState<JaNeinUnbekannt>(start?.sicherheitsdispositiv ?? "unbekannt");
  const [baujahr, setBaujahr] = useState(text(start?.baujahr));
  const [tueren, setTueren] = useState(text(start?.kabinenabschlusstueren));
  const [traglast, setTraglast] = useState(text(start?.traglastKg));
  const [geschw, setGeschw] = useState(text(start?.geschwindigkeitMs));
  const [fehler, setFehler] = useState<string | null>(null);

  const opt = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const unbekannte = [antrieb === "unbekannt", hersteller === "unbekannt", brandfall === "unbekannt", baujahr === ""].filter(Boolean).length;
  // Hinweis auf viele offene Angaben erst, wenn die Pflichtfelder ausgefüllt sind (Verbesserung Nr. 16).
  const ausgefuellt = /^\d{4}$/.test(plz.trim()) && Number(halte) >= 2 && attika !== null;

  function absenden(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(plz.trim())) return setFehler("Bitte eine vierstellige Postleitzahl angeben.");
    if (!(Number(halte) >= 2)) return setFehler("Bitte die Anzahl Haltestellen angeben (mindestens 2).");
    if (!(Number(anzahl) >= 1)) return setFehler("Bitte die Anzahl Aufzüge angeben.");
    if (!attika) return setFehler("Bitte angeben, ob eine Attika vorhanden ist.");
    setFehler(null);
    const params = toParams({
      gebaeudetyp,
      plz: plz.trim(),
      anzahlAufzuege: Number(anzahl),
      aufzugsart: art,
      antrieb,
      hersteller,
      haltestellen: Number(halte),
      brandfallsteuerung: brandfall,
      attika,
      sicherheitsdispositiv: sicherheit,
      baujahr: opt(baujahr),
      kabinenabschlusstueren: opt(tueren),
      traglastKg: opt(traglast),
      geschwindigkeitMs: opt(geschw),
    });
    router.push(`/angebote?${params.toString()}`);
  }

  return (
    <>
      <Header variant="bar" step="Schritt 1 von 2: Anlage erfassen" />
      <main className="config">
        <section className="config__visual" aria-label="Zusammenfassung">
          <div className="anlage-bild">
            {ANTRIEBE.map(({ value }) => (
              <Image
                key={value}
                src={BILD[value].src}
                alt={value === antrieb ? BILD[value].alt : ""}
                aria-hidden={value === antrieb ? undefined : true}
                className={value === antrieb ? "sichtbar" : undefined}
                fill
                priority={value === "seil"}
                sizes="(max-width: 960px) 100vw, 720px"
              />
            ))}
          </div>
          <div>
            <div className="config__title">{art}</div>
            <p className="hint">
              Antrieb: {ANTRIEBE.find((a) => a.value === antrieb)?.label} · {gebaeudetyp}
            </p>
          </div>
          <div className="config__stats">
            <div>
              <strong>{anzahl || "–"}</strong>
              <span>Aufzüge</span>
            </div>
            <div>
              <strong>{halte || "–"}</strong>
              <span>Haltestellen</span>
            </div>
            <div>
              <strong>{BRANDFALL.find((b) => b.value === brandfall)?.label}</strong>
              <span>Brandfallsteuerung</span>
            </div>
          </div>
        </section>

        <form className="config__form" onSubmit={absenden} noValidate>
          <div>
            <h1>Ihre Anlage</h1>
            <p className="hint">
              Felder mit Stern sind Pflicht. Unbekanntes lassen Sie offen. <Link href="/anlagedaten">Wo finde ich diese Angaben?</Link>
            </p>
          </div>

          <fieldset className="group">
            <legend>Gebäude</legend>
            <label className="field">
              Gebäudetyp *
              <select value={gebaeudetyp} onChange={(e) => setGebaeudetyp(e.target.value)}>
                {GEBAEUDETYPEN.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <div className="grid2">
              <label className="field">
                PLZ *
                <input inputMode="numeric" maxLength={4} placeholder="8000" value={plz} onChange={(e) => { setPlz(e.target.value); setFehler(null); }} required />
              </label>
              <label className="field">
                Anzahl Aufzüge *
                <input type="number" min={1} value={anzahl} onChange={(e) => setAnzahl(e.target.value)} required />
              </label>
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>Aufzugsart *</legend>
            <Choices options={ARTEN.map((a) => ({ value: a, label: a }))} value={art} onChange={setArt} />
          </fieldset>

          <fieldset className="group">
            <legend>Antriebsart *</legend>
            <div className="grid3">
              <Choices options={ANTRIEBE} value={antrieb} onChange={setAntrieb} />
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>Technik</legend>
            {/* dense: Haltestellen rückt neben den Hersteller, die Suchliste darunter über die ganze Breite */}
            <div className="grid2" style={{ gridAutoFlow: "row dense" }}>
              <HerstellerWahl value={hersteller} onChange={setHersteller} />
              <label className="field">
                Haltestellen *
                <input type="number" min={2} placeholder="5" value={halte} onChange={(e) => { setHalte(e.target.value); setFehler(null); }} required />
              </label>
              <label className="field">
                Baujahr
                <input inputMode="numeric" maxLength={4} placeholder="z. B. 1998" value={baujahr} onChange={(e) => setBaujahr(e.target.value)} />
              </label>
              <label className="field">
                Zusätzliche Kabinenabschlusstüren
                <input type="number" min={0} placeholder="0" value={tueren} onChange={(e) => setTueren(e.target.value)} />
              </label>
              <label className="field">
                Traglast (kg)
                <input type="number" min={0} placeholder="630" value={traglast} onChange={(e) => setTraglast(e.target.value)} />
              </label>
              <label className="field">
                Nenngeschwindigkeit (m/s)
                <input type="number" min={0} step={0.1} placeholder="1.0" value={geschw} onChange={(e) => setGeschw(e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>Brandfallsteuerung vorhanden *</legend>
            <div className="grid3">
              <Choices options={BRANDFALL} value={brandfall} onChange={setBrandfall} />
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>Attika vorhanden *</legend>
            <div className="grid3">
              <Choices options={ATTIKA} value={attika} onChange={setAttika} />
            </div>
            <p className="hint">Zurückversetztes oberstes Geschoss (Attikageschoss).</p>
          </fieldset>

          <fieldset className="group">
            <legend>Sicherheitsdispositiv vorhanden *</legend>
            <div className="grid3">
              <Choices options={BRANDFALL} value={sicherheit} onChange={setSicherheit} />
            </div>
            <p className="hint">Zusätzliche Schutzeinrichtung im Schacht, wenn Schachtkopf oder Grube zu klein sind.</p>
          </fieldset>

          {fehler && (
            <p className="error" role="alert">
              {fehler}
            </p>
          )}

          <button type="submit" className="btn btn--dark">
            Angebote anzeigen
          </button>
          {ausgefuellt && unbekannte >= 3 && (
            <p className="hint" role="status">
              Viele Angaben sind offen. Eine Beratung vor Ort liefert genauere Angebote.
            </p>
          )}
          <Link href="/beratung" className="link-muted">
            Zu viele offene Angaben? Beratung vor Ort buchen
          </Link>
        </form>
      </main>
    </>
  );
}
