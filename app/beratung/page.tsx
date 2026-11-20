import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MARKE } from "@/lib/config";
import { BeratungForm } from "./BeratungForm";

export const metadata: Metadata = { title: `Beratung vor Ort – ${MARKE}` };

export default function BeratungPage() {
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
          <h1>Beratung vor Ort</h1>
          <p className="muted">
            Keine Anlagedaten zur Hand? Unsere Fachperson kommt vorbei, erfasst die Anlage und erstellt Ihren Vergleich. Anfangspauschale CHF
            130, danach nach Aufwand.
          </p>
        </div>
        <BeratungForm />
      </main>
      <Footer />
    </>
  );
}
