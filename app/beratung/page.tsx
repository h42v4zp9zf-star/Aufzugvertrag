import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BERATUNG_PREIS_CHF, MARKE } from "@/lib/config";
import { db, dbKonfiguriert } from "@/lib/db";
import { belegteTermine } from "@/lib/repo";
import { heuteInZuerich, kalenderTage } from "@/lib/termine";
import { BeratungForm } from "./BeratungForm";

export const metadata: Metadata = { title: `Beratung vor Ort – ${MARKE}` };
// Freie Termine bei jedem Aufruf neu laden.
export const dynamic = "force-dynamic";

async function belegt(von: string, bis: string): Promise<string[]> {
  if (!dbKonfiguriert()) return [];
  try {
    return await belegteTermine(await db(), von, bis);
  } catch (e) {
    // Seite trotzdem zeigen; beim Absenden prüft der Server noch einmal.
    console.error("Belegte Termine konnten nicht geladen werden", e);
    return [];
  }
}

export default async function BeratungPage() {
  const heute = heuteInZuerich();
  const tage = kalenderTage(heute);
  const besetzt = await belegt(tage[0], tage[tage.length - 1]);

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
            Keine Anlagedaten zur Hand? Unsere Fachperson kommt vorbei, erfasst die Anlage und erstellt Ihren Vergleich. Fixpreis CHF{" "}
            {BERATUNG_PREIS_CHF}, ohne Zusatzkosten. Wählen Sie direkt einen freien Termin.
          </p>
        </div>
        <BeratungForm heute={heute} belegt={besetzt} />
      </main>
      <Footer />
    </>
  );
}
