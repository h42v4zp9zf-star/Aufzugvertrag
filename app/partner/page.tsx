import Link from "next/link";
import { redirect } from "next/navigation";
import { AnfragenTabelle } from "@/components/AnfragenTabelle";
import { PortalHeader } from "@/components/PortalHeader";
import { db, dbKonfiguriert } from "@/lib/db";
import { anfragenListe, preismodellLaden } from "@/lib/repo";
import { kontoErforderlich } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

export default async function PartnerUebersicht() {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich();
  if (konto.rolle === "admin") redirect("/admin");
  const d = await db();
  const [modell, anfragen] = await Promise.all([preismodellLaden(d, konto.id), anfragenListe(d, konto.id)]);

  let hinweis: string;
  if (konto.status === "pruefung") {
    hinweis = "Ihr Konto wird geprüft. Sie können Ihre Preise schon erfassen. Sie erscheinen im Vergleich, sobald wir Ihr Konto freigeschaltet haben.";
  } else if (!modell) {
    hinweis = "Ihr Konto ist freigeschaltet. Erfassen Sie jetzt Ihre Preise, damit Ihre Angebote im Vergleich erscheinen.";
  } else if (!modell.veroeffentlicht) {
    hinweis = "Ihre Preise sind gespeichert, aber nicht veröffentlicht. Kunden sehen Ihre Angebote noch nicht.";
  } else {
    hinweis = "Ihre Preise sind veröffentlicht. Kunden sehen Ihre Angebote im Vergleich.";
  }

  return (
    <>
      <PortalHeader konto={konto} />
      <main className="portal">
        <div className="stack">
          <h1>{konto.firma}</h1>
          <div className={`banner${konto.status === "aktiv" && modell?.veroeffentlicht ? " banner--ok" : ""}`}>{hinweis}</div>
        </div>

        <section className="card">
          <div className="row-between">
            <h2>Preismodell</h2>
            <Link href="/partner/preise" className="btn btn--dark btn--small">
              {modell ? "Preise bearbeiten" : "Preise erfassen"}
            </Link>
          </div>
          <p className="muted">
            {modell
              ? `Zuletzt geändert am ${new Date(modell.geaendert_am).toLocaleDateString("de-CH")}. ${modell.daten.pakete.length} Paket(e) erfasst.`
              : "Noch keine Preise erfasst."}
          </p>
        </section>

        <section className="card">
          <h2>Anfragen</h2>
          <p className="muted">Kunden, die eines Ihrer Angebote angenommen haben. Der Vertrag wird direkt zwischen Ihnen und dem Kunden abgeschlossen.</p>
          <AnfragenTabelle anfragen={anfragen} />
        </section>
      </main>
    </>
  );
}
