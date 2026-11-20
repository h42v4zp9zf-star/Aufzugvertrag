import Link from "next/link";
import type { ReactNode } from "react";
import { MARKE } from "@/lib/config";

export { MARKE };

export function Header({ variant, step, rechts }: { variant: "overlay" | "bar"; step?: string; rechts?: ReactNode }) {
  return (
    <header className={`header header--${variant}`}>
      <Link href="/" className="logo">
        {MARKE}
      </Link>
      {rechts ? (
        rechts
      ) : step ? (
        <div className="step">{step}</div>
      ) : (
        <>
          <nav className="nav" aria-label="Hauptnavigation">
            <a href="#ablauf">So funktioniert&apos;s</a>
            <a href="#beratung">Beratung vor Ort</a>
            <a href="#partner">Für Liftfirmen</a>
          </nav>
          <nav className="nav" aria-label="Konto">
            <Link href="/partner/login">Partner-Login</Link>
          </nav>
        </>
      )}
    </header>
  );
}
