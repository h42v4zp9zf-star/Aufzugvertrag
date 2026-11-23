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

export default async function AdminPage() {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich("admin");
  const d = await db();
  const [konten, anfragen, beratungen] = await Promise.all([kontenListe(d), anfragenListe(d), beratungenListe(d)]);

  return (
    <>
      <PortalHeader konto={konto} />
      <main className="portal" style={{ maxWidth: 1200 }}>
        <h1>Verwaltung</h1>

        <section className="card">
          <h2>Liftfirmen</h2>
          <FirmenTabelle konten={konten} />
        </section>

        <section className="card">
          <AnfragenListe anfragen={anfragen} />
        </section>

        <section className="card">
          <BeratungenListe beratungen={beratungen} heute={heuteZuerich()} />
        </section>
      </main>
    </>
  );
}
