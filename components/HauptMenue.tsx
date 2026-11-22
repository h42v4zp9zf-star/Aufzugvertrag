"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Navigation der Startseite. Auf breiten Bildschirmen stehen die Links in der Kopfzeile,
// auf dem Handy klappen sie hinter dem Menü-Knopf (☰) auf.
export function HauptMenue() {
  const [offen, setOffen] = useState(false);
  const schliessen = () => setOffen(false);

  useEffect(() => {
    if (!offen) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOffen(false);
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen]);

  return (
    <>
      <button
        type="button"
        className="menu-btn"
        aria-expanded={offen}
        aria-controls="hauptmenue"
        onClick={() => setOffen((o) => !o)}
      >
        <span className="sr-only">{offen ? "Menü schliessen" : "Menü öffnen"}</span>
        <span aria-hidden="true" className={`menu-icon${offen ? " menu-icon--x" : ""}`} />
      </button>
      <div id="hauptmenue" className={`menu${offen ? " menu--offen" : ""}`}>
        <nav className="nav" aria-label="Hauptnavigation">
          <a href="#ablauf" onClick={schliessen}>
            So funktioniert&apos;s
          </a>
          <a href="#beratung" onClick={schliessen}>
            Beratung vor Ort
          </a>
          <a href="#partner" onClick={schliessen}>
            Für Liftfirmen
          </a>
        </nav>
        <nav className="nav" aria-label="Konto">
          <Link href="/partner/login" onClick={schliessen}>
            Partner-Login
          </Link>
        </nav>
      </div>
    </>
  );
}
