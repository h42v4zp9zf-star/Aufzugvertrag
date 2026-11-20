import { redirect } from "next/navigation";
import { DbFehlt } from "@/components/DbFehlt";
import { PortalHeader } from "@/components/PortalHeader";
import { dbKonfiguriert } from "@/lib/db";
import { aktuellesKonto } from "@/lib/sitzung";
import { LoginForm } from "../Formulare";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (dbKonfiguriert()) {
    const konto = await aktuellesKonto();
    if (konto) redirect(konto.rolle === "admin" ? "/admin" : "/partner");
  }
  return (
    <>
      <PortalHeader konto={null} />
      <main className="portal portal--narrow">
        <div className="stack">
          <h1>Anmelden</h1>
          <p className="muted">Für Liftfirmen: Preise hinterlegen und Anfragen sehen.</p>
        </div>
        {dbKonfiguriert() ? <LoginForm /> : <DbFehlt />}
      </main>
    </>
  );
}
