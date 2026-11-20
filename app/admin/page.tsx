import { redirect } from "next/navigation";
import { AnfragenTabelle } from "@/components/AnfragenTabelle";
import { PortalHeader } from "@/components/PortalHeader";
import { kontoStatusAendern } from "@/app/partner/actions";
import { db, dbKonfiguriert } from "@/lib/db";
import { chf, VERMITTLUNGSGEBUEHR_CHF } from "@/lib/pricing";
import { anfragenListe, kontenListe, type KontoStatus } from "@/lib/repo";
import { kontoErforderlich } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

const STATUS_TEXT: Record<KontoStatus, string> = { pruefung: "In Prüfung", aktiv: "Freigeschaltet", gesperrt: "Gesperrt" };

function StatusKnopf({ id, status, label, dunkel = false }: { id: number; status: KontoStatus; label: string; dunkel?: boolean }) {
  return (
    <form action={kontoStatusAendern} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`btn btn--small ${dunkel ? "btn--dark" : "btn--outline"}`}>
        {label}
      </button>
    </form>
  );
}

export default async function AdminPage() {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich("admin");
  const d = await db();
  const [konten, anfragen] = await Promise.all([kontenListe(d), anfragenListe(d)]);

  return (
    <>
      <PortalHeader konto={konto} />
      <main className="portal" style={{ maxWidth: 1200 }}>
        <h1>Verwaltung</h1>

        <section className="card">
          <h2>Liftfirmen</h2>
          {konten.length === 0 ? (
            <p className="muted">Noch keine Registrierungen.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Firma</th>
                    <th>UID</th>
                    <th>E-Mail</th>
                    <th>Status</th>
                    <th className="right">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {konten.map((k) => (
                    <tr key={k.id}>
                      <td>{k.firma}</td>
                      <td>{k.uid}</td>
                      <td>{k.email}</td>
                      <td>
                        <span className={`pill${k.status === "aktiv" ? " pill--aktiv" : ""}`}>{STATUS_TEXT[k.status]}</span>
                      </td>
                      <td className="right" style={{ whiteSpace: "nowrap" }}>
                        {k.status !== "aktiv" && <StatusKnopf id={k.id} status="aktiv" label="Freischalten" dunkel />}{" "}
                        {k.status !== "gesperrt" && <StatusKnopf id={k.id} status="gesperrt" label="Sperren" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="row-between">
            <h2>Alle Anfragen</h2>
            <span className="muted">
              {anfragen.length} Anfrage(n) · Vermittlungsgebühren {chf(anfragen.length * VERMITTLUNGSGEBUEHR_CHF)}
            </span>
          </div>
          <AnfragenTabelle anfragen={anfragen} mitFirma />
        </section>
      </main>
    </>
  );
}
