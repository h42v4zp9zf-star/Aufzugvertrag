import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/PortalHeader";
import { db, dbKonfiguriert } from "@/lib/db";
import { anfragenListe, beratungenListe, kontenListe } from "@/lib/repo";
import { kontoErforderlich } from "@/lib/sitzung";
import { AnfragenListe } from "./_tabellen/AnfragenListe";
import { BeratungenListe } from "./_tabellen/BeratungenListe";
import { FirmenTabelle } from "./_tabellen/FirmenTabelle";

export const dynamic = "force-dynamic";

/** Heutiges Datum in Zürich als „JJJJ-MM-TT“ (für „kommende Termine“). */
const heuteZuerich = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());

// Untermenü der Verwaltung (Wunsch Dario 23.11.2026): Beratung vor Ort zuerst.
const BEREICHE = [
  { id: "beratungen", label: "Beratung vor Ort" },
  { id: "firmen", label: "Liftfirmen" },
  { id: "anfragen", label: "Alle Anfragen" },
] as const;
type Bereich = (typeof BEREICHE)[number]["id"];

const istBereich = (v: unknown): v is Bereich => BEREICHE.some((b) => b.id === v);
const bereichLink = (b: Bereich) => (b === "beratungen" ? "/admin" : `/admin?bereich=${b}`);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ bereich?: string | string[] }> }) {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich("admin");
  const { bereich: roh } = await searchParams;
  const bereich: Bereich = istBereich(roh) ? roh : "beratungen";
  const d = await db();

  return (
    <>
      <PortalHeader konto={konto} />
      <main className="portal" style={{ maxWidth: 1200 }}>
        <div className="verwaltung-kopf">
          <h1>Verwaltung</h1>
          <nav className="reiter" aria-label="Bereiche der Verwaltung">
            {BEREICHE.map((b) => (
              <Link
                key={b.id}
                href={bereichLink(b.id)}
                className="reiter__link"
                aria-current={b.id === bereich ? "page" : undefined}
                scroll={false}
              >
                {b.label}
              </Link>
            ))}
          </nav>
        </div>

        {bereich === "beratungen" && (
          <section className="card">
            <BeratungenListe beratungen={await beratungenListe(d)} heute={heuteZuerich()} />
          </section>
        )}

        {bereich === "firmen" && (
          <section className="card">
            <h2>Liftfirmen</h2>
            <FirmenTabelle konten={await kontenListe(d)} />
          </section>
        )}

        {bereich === "anfragen" && (
          <section className="card">
            <AnfragenListe anfragen={await anfragenListe(d)} />
          </section>
        )}
      </main>
    </>
  );
}
