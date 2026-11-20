import Link from "next/link";

// Platzhalter, bis der Name der Plattform feststeht.
export const MARKE = "[NAME]";

export function Header({ variant, step }: { variant: "overlay" | "bar"; step?: string }) {
  return (
    <header className={`header header--${variant}`}>
      <Link href="/" className="logo">
        {MARKE}
      </Link>
      {step ? (
        <div className="step">{step}</div>
      ) : (
        <>
          <nav className="nav" aria-label="Hauptnavigation">
            <a href="#ablauf">So funktioniert&apos;s</a>
            <a href="#beratung">Beratung vor Ort</a>
            <a href="#partner">Für Liftfirmen</a>
          </nav>
          <nav className="nav" aria-label="Konto">
            <a href="#partner">Partner-Login</a>
          </nav>
        </>
      )}
    </header>
  );
}
