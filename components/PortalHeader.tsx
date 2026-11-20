import Link from "next/link";
import { abmelden } from "@/app/partner/actions";
import type { Konto } from "@/lib/repo";
import { Header } from "./Header";

export function PortalHeader({ konto }: { konto: Konto | null }) {
  return (
    <Header
      variant="bar"
      rechts={
        konto ? (
          <nav className="nav" aria-label="Portal">
            {konto.rolle === "admin" ? (
              <Link href="/admin">Verwaltung</Link>
            ) : (
              <>
                <Link href="/partner">Übersicht</Link>
                <Link href="/partner/preise">Preise</Link>
              </>
            )}
            <form action={abmelden} className="inline-form">
              <button type="submit" className="btn btn--outline btn--small">
                Abmelden
              </button>
            </form>
          </nav>
        ) : (
          <div className="step">Liftfirmen-Portal</div>
        )
      }
    />
  );
}
