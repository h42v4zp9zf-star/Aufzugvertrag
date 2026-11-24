import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

// Eigene Fehlerseite auf Deutsch mit Weg zurück (Verbesserung Nr. 31), statt der leeren englischen „404“.
export const metadata: Metadata = { title: "Seite nicht gefunden" };

export default function NichtGefunden() {
  return (
    <>
      <Header
        variant="bar"
        rechts={
          <nav className="nav" aria-label="Navigation">
            <Link href="/">Zur Startseite</Link>
          </nav>
        }
      />
      <main className="portal portal--narrow">
        <div className="stack">
          <h1>Seite nicht gefunden</h1>
          <p className="muted">Diese Seite gibt es nicht. Vielleicht hat sich die Adresse geändert, oder der Link ist unvollständig.</p>
        </div>
        <div className="btn-row btn-row--start">
          <Link href="/" className="btn btn--dark btn--wide">
            Zur Startseite
          </Link>
          <Link href="/anlage" className="btn btn--outline btn--wide">
            Angebote vergleichen
          </Link>
        </div>
      </main>
    </>
  );
}
