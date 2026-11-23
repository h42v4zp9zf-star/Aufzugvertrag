"use client";

// Filterzeile über den Tabellen der Verwaltung (Wunsch Dario, 23.11.2026):
// Suchfeld, Auswahlfilter und Sortierung. Wirkt sofort, ohne die Seite neu zu laden.

import { useId, type ReactNode } from "react";
import { suchtext } from "@/lib/stammdaten";

export function Suche({ wert, setzen, platzhalter }: { wert: string; setzen: (v: string) => void; platzhalter: string }) {
  const id = useId();
  return (
    <div className="field filter__suche">
      <label htmlFor={id}>Suchen</label>
      <input id={id} type="search" value={wert} placeholder={platzhalter} onChange={(e) => setzen(e.target.value)} />
    </div>
  );
}

export function Auswahl({
  label,
  wert,
  setzen,
  optionen,
}: {
  label: string;
  wert: string;
  setzen: (v: string) => void;
  optionen: readonly (readonly [string, string])[];
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={wert} onChange={(e) => setzen(e.target.value)}>
        {optionen.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterZeile({ children }: { children: ReactNode }) {
  return <div className="filter">{children}</div>;
}

/** Passt ein Eintrag zur Suche? Gross-/Kleinschreibung und Akzente spielen keine Rolle. */
export function passt(suche: string, ...felder: (string | null | undefined)[]): boolean {
  const s = suchtext(suche);
  if (!s) return true;
  return felder.some((f) => f && suchtext(f).includes(s));
}

export const alphabetisch = (a: string, b: string) => a.localeCompare(b, "de-CH", { sensitivity: "base" });
export const zeit = (d: Date | string) => new Date(d).getTime();

export function KeineTreffer() {
  return <p className="muted">Keine Treffer für diesen Filter.</p>;
}
