"use client";

// Hersteller-Auswahl (Wunsch Dario, 23.11.2026): „Unbekannt“ und die 6 grossen direkt,
// bei „Andere“ öffnet sich die ganze Liste mit Suchfeld. Zuoberst steht „Unbekannt“,
// zuunterst „Nicht in der Liste“ mit einem Feld für den Namen. Registrierte Liftfirmen
// erscheinen ebenfalls in der Liste, sobald sie sich angemeldet haben.

import { useEffect, useMemo, useRef, useState } from "react";
import { HERSTELLER_HAUPT, herstellerSuchliste, suchtext } from "@/lib/stammdaten";

const ANDERE = "__andere";

export function HerstellerWahl({
  value,
  onChange,
  label = "Hersteller *",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [offen, setOffen] = useState(false);
  const [suche, setSuche] = useState("");
  const [eigener, setEigener] = useState(false);
  const [eigenerName, setEigenerName] = useState("");

  const [firmen, setFirmen] = useState<string[]>([]);
  const geladen = useRef(false);

  // Registrierte Liftfirmen erst laden, wenn die Liste zum ersten Mal aufgeht.
  useEffect(() => {
    if (!offen || geladen.current) return;
    geladen.current = true;
    fetch("/api/hersteller")
      .then((r) => (r.ok ? r.json() : { firmen: [] }))
      .then((d: { firmen?: unknown }) => {
        if (Array.isArray(d.firmen)) setFirmen(d.firmen.filter((f): f is string => typeof f === "string"));
      })
      .catch(() => undefined);
  }, [offen]);

  const liste = useMemo(() => herstellerSuchliste(firmen), [firmen]);
  const treffer = liste.filter((h) => suchtext(h).includes(suchtext(suche)));
  const direkt = value === "unbekannt" || HERSTELLER_HAUPT.includes(value);

  function waehlen(h: string) {
    onChange(h);
    setOffen(false);
    setSuche("");
    setEigener(false);
  }

  let andereText = "Andere …";
  if (!direkt && value !== "Andere") andereText = `Andere: ${value}`;

  return (
    <>
      <label className="field">
        {label}
        <select
          value={direkt ? value : ANDERE}
          onChange={(e) => {
            if (e.target.value !== ANDERE) return waehlen(e.target.value);
            if (direkt) onChange("Andere");
            setOffen(true);
          }}
        >
          <option value="unbekannt">Unbekannt</option>
          {HERSTELLER_HAUPT.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
          <option value={ANDERE}>{andereText}</option>
        </select>
      </label>

      {offen && (
        <div className="hersteller-extra hersteller-suche">
          <input
            type="search"
            aria-label="Hersteller suchen"
            placeholder="Hersteller suchen, z. B. Garaventa"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            autoFocus
          />
          <ul className="hersteller-liste">
            <li>
              <button type="button" className="hersteller-eintrag hersteller-eintrag--fix" onClick={() => waehlen("unbekannt")}>
                Unbekannt
              </button>
            </li>
            {treffer.map((h) => (
              <li key={h}>
                <button type="button" className="hersteller-eintrag" aria-pressed={value === h} onClick={() => waehlen(h)}>
                  {h}
                </button>
              </li>
            ))}
            {treffer.length === 0 && <li className="hersteller-leer">Keine Firma gefunden.</li>}
            <li>
              <button
                type="button"
                className="hersteller-eintrag hersteller-eintrag--fix"
                onClick={() => {
                  setEigener(true);
                  setOffen(false);
                  onChange(eigenerName.trim() || "Andere");
                }}
              >
                Nicht in der Liste
              </button>
            </li>
          </ul>
        </div>
      )}

      {!offen && eigener && !direkt && (
        <label className="field hersteller-extra">
          Name des Herstellers
          <input
            maxLength={80}
            placeholder="z. B. Muster Aufzüge AG"
            value={eigenerName}
            autoFocus
            onChange={(e) => {
              setEigenerName(e.target.value);
              onChange(e.target.value.trim() || "Andere");
            }}
          />
        </label>
      )}

      {!offen && !direkt && (
        <p className="hint hersteller-extra">
          <button type="button" className="linkbtn" onClick={() => setOffen(true)}>
            Liste der Hersteller öffnen
          </button>
        </p>
      )}
    </>
  );
}
