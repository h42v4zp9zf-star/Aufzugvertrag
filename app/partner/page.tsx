import Link from "next/link";
import { redirect } from "next/navigation";
import { AnfragenTabelle } from "@/components/AnfragenTabelle";
import { PortalHeader } from "@/components/PortalHeader";
import { db, dbKonfiguriert } from "@/lib/db";
import { anfragenListe, preismodellLaden, UNTERLAGEN_MAX, unterlagenListe } from "@/lib/repo";
import { kontoErforderlich } from "@/lib/sitzung";
import { Unterlagen } from "./Unterlagen";

export const dynamic = "force-dynamic";

export default async function PartnerUebersicht() {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich();
  if (konto.rolle === "admin") redirect("/admin");
  const d = await db();
  const [modell, anfragen, unterlagen] = await Promise.all([preismodellLaden(d, konto.id), anfragenListe(d, konto.id), unterlagenListe(d, konto.id)]);

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
          <h2>Vertragsunterlagen</h2>
          <p className="muted">
            Freiwillig: Laden Sie hier Ihren Wartungsvertrag oder Ihre AGB als PDF hoch, höchstens {UNTERLAGEN_MAX} Dateien. Die Unterlagen sieht
            nur die Verwaltung von Elevaris, Kunden sehen sie nicht.
          </p>
          <Unterlagen
            max={UNTERLAGEN_MAX}
            liste={unterlagen.map((u) => ({
              id: u.id,
              dateiname: u.dateiname,
              groesse: u.groesse,
              datum: new Date(u.erstellt_am).toLocaleDateString("de-CH", { timeZone: "Europe/Zurich" }),
            }))}
          />
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
