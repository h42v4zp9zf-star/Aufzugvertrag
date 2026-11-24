import type { Metadata } from "next";
import Link from "next/link";
import { DbFehlt } from "@/components/DbFehlt";
import { PortalHeader } from "@/components/PortalHeader";
import { db, dbKonfiguriert } from "@/lib/db";
import { tokenHash } from "@/lib/passwort";
import { kontoPerPasswortLink } from "@/lib/repo";
import { NeuesPasswortForm } from "../Formulare";

export const dynamic = "force-dynamic";
// Der Link enthält das Token: nie als Referrer an andere Seiten weitergeben.
export const metadata: Metadata = { title: "Neues Passwort", referrer: "no-referrer" };

export default async function NeuesPasswortPage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  const roh = (await searchParams).t;
  const token = typeof roh === "string" ? roh : "";
  const konto = dbKonfiguriert() && token ? await kontoPerPasswortLink(await db(), tokenHash(token)) : null;
  return (
    <>
      <PortalHeader konto={null} />
      <main className="portal portal--narrow">
        {!dbKonfiguriert() ? (
          <DbFehlt />
        ) : konto ? (
          <>
            <div className="stack">
              <h1>Neues Passwort</h1>
              <p className="muted">
                Für {konto.firma} ({konto.email}). Danach melden Sie sich mit dem neuen Passwort an.
              </p>
            </div>
            <NeuesPasswortForm token={token} />
          </>
        ) : (
          <div className="stack">
            <h1>Link ungültig</h1>
            <p className="muted">Dieser Link ist abgelaufen oder wurde schon benutzt.</p>
            <p>
              <Link href="/partner/passwort" className="btn btn--dark">
                Neuen Link anfordern
              </Link>
            </p>
          </div>
        )}
      </main>
    </>
  );
}
