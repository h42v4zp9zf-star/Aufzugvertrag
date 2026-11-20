"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Header } from "@/components/Header";
import { toParams } from "@/lib/anlageParams";
import type { Antrieb, JaNeinUnbekannt } from "@/lib/pricing";

const GEBAEUDETYPEN = ["Mehrfamilienhaus", "Büro", "Hotel", "Spital / Pflegeheim", "Industrie", "Gewerbe", "Mischnutzung", "Andere"];
const ARTEN = ["Personenaufzug", "Lastenaufzug", "Personen- und Lastenaufzug", "Plattformlift"];
const ANTRIEBE: { value: Antrieb; label: string }[] = [
  { value: "seil", label: "Seil" },
  { value: "hydraulik", label: "Hydraulik" },
  { value: "unbekannt", label: "Unbekannt" },
];
const HERSTELLER = ["unbekannt", "Schindler", "KONE", "TK Elevator", "Otis", "Emch", "AS Aufzüge", "Andere"];
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
  value: T;
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

export default function AnlageErfassen() {
  const router = useRouter();
  const [gebaeudetyp, setGebaeudetyp] = useState(GEBAEUDETYPEN[0]);
  const [plz, setPlz] = useState("");
  const [anzahl, setAnzahl] = useState("1");
  const [art, setArt] = useState(ARTEN[0]);
  const [antrieb, setAntrieb] = useState<Antrieb>("seil");
  const [hersteller, setHersteller] = useState(HERSTELLER[0]);
  const [halte, setHalte] = useState("");
  const [brandfall, setBrandfall] = useState<JaNeinUnbekannt>("unbekannt");
  const [baujahr, setBaujahr] = useState("");
  const [tueren, setTueren] = useState("");
  const [traglast, setTraglast] = useState("");
  const [geschw, setGeschw] = useState("");
  const [email, setEmail] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  const opt = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const unbekannte = [antrieb === "unbekannt", hersteller === "unbekannt", brandfall === "unbekannt", baujahr === ""].filter(Boolean).length;

  function absenden(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(plz.trim())) return setFehler("Bitte eine vierstellige Postleitzahl angeben.");
    if (!(Number(halte) >= 2)) return setFehler("Bitte die Anzahl Haltestellen angeben (mindestens 2).");
    if (!(Number(anzahl) >= 1)) return setFehler("Bitte die Anzahl Aufzüge angeben.");
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
          <div className="placeholder" aria-hidden="true">
            Bild: Aufzug passend zur gewählten Art
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
            <p className="hint">Felder mit Stern sind Pflicht. Unbekanntes lassen Sie offen.</p>
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
            <div className="grid2">
              <label className="field">
                Hersteller *
                <select value={hersteller} onChange={(e) => setHersteller(e.target.value)}>
                  {HERSTELLER.map((h) => (
                    <option key={h} value={h}>
                      {h === "unbekannt" ? "Unbekannt" : h}
                    </option>
                  ))}
                </select>
              </label>
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
            <legend>Kontakt</legend>
            <label className="field">
              E-Mail
              <input type="email" placeholder="name@verwaltung.ch" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <p className="hint">Kein Konto nötig. Später schicken wir Ihnen den Link zu Ihrem Vergleich per E-Mail.</p>
          </fieldset>

          {fehler && (
            <p className="error" role="alert">
              {fehler}
            </p>
          )}

          <button type="submit" className="btn btn--dark">
            Angebote anzeigen
          </button>
          {unbekannte >= 3 && (
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
