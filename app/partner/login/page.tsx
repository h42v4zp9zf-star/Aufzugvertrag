import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DbFehlt } from "@/components/DbFehlt";
import { PortalHeader } from "@/components/PortalHeader";
import { dbKonfiguriert } from "@/lib/db";
import { aktuellesKonto } from "@/lib/sitzung";
import { LoginForm } from "../Formulare";

export const metadata: Metadata = { title: "Anmelden" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ passwort?: string | string[] }> }) {
  const passwortNeu = (await searchParams).passwort === "neu";
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
        {passwortNeu && (
          <p className="banner banner--ok" role="status">
            Ihr Passwort ist geändert. Bitte melden Sie sich mit dem neuen Passwort an.
          </p>
        )}
        {dbKonfiguriert() ? <LoginForm /> : <DbFehlt />}
      </main>
    </>
  );
}
