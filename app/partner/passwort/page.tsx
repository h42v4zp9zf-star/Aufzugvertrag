import type { Metadata } from "next";
import { DbFehlt } from "@/components/DbFehlt";
import { PortalHeader } from "@/components/PortalHeader";
import { dbKonfiguriert } from "@/lib/db";
import { PasswortVergessenForm } from "./Formulare";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Passwort vergessen" };

export default function PasswortVergessenPage() {
  return (
    <>
      <PortalHeader konto={null} />
      <main className="portal portal--narrow">
        <div className="stack">
          <h1>Passwort vergessen</h1>
          <p className="muted">
            Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir schicken Ihnen einen Link, mit dem Sie ein neues Passwort setzen.
          </p>
        </div>
        {dbKonfiguriert() ? <PasswortVergessenForm /> : <DbFehlt />}
      </main>
    </>
  );
}
