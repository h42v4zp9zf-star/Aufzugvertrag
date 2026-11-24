import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DbFehlt } from "@/components/DbFehlt";
import { PortalHeader } from "@/components/PortalHeader";
import { dbKonfiguriert } from "@/lib/db";
import { aktuellesKonto } from "@/lib/sitzung";
import { RegistrierenForm } from "../Formulare";

export const metadata: Metadata = { title: "Partner werden" };
export const dynamic = "force-dynamic";

export default async function RegistrierenPage() {
  if (dbKonfiguriert() && (await aktuellesKonto())) redirect("/partner");
  return (
    <>
      <PortalHeader konto={null} />
      <main className="portal portal--narrow">
        <div className="stack">
          <h1>Partner werden</h1>
          <p className="muted">
            Hinterlegen Sie Ihr Preismodell einmal. Passende Kundenanfragen erhalten Sie mit fertig berechnetem
            Angebot.
          </p>
        </div>
        {dbKonfiguriert() ? <RegistrierenForm /> : <DbFehlt />}
      </main>
    </>
  );
}
