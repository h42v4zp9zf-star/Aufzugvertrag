"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { KONTAKT_EMAIL } from "@/lib/config";

// Fehlerseite auf Deutsch, wenn auf einer Seite etwas schiefgeht (Verbesserung Nr. 31).
export default function Fehler({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
          <h1>Etwas ist schiefgelaufen</h1>
          <p className="muted">
            Bitte versuchen Sie es noch einmal. Wenn der Fehler bleibt, schreiben Sie uns an{" "}
            <a href={`mailto:${KONTAKT_EMAIL}`} style={{ textDecoration: "underline" }}>
              {KONTAKT_EMAIL}
            </a>
            .
          </p>
        </div>
        <div className="btn-row btn-row--start">
          <button type="button" className="btn btn--dark btn--wide" onClick={reset}>
            Nochmals versuchen
          </button>
          <Link href="/" className="btn btn--outline btn--wide">
            Zur Startseite
          </Link>
        </div>
      </main>
    </>
  );
}
