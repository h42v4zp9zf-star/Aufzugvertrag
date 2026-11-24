import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ADRESSE, KONTAKT_EMAIL, MARKE, VERANTWORTLICH } from "@/lib/config";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <>
      <Header
        variant="bar"
        rechts={
          <nav className="nav" aria-label="Navigation">
            <Link href="/">Zur Startseite</Link>
          </nav>
        }
      />
      <main className="portal portal--narrow">
        <h1>Impressum</h1>
        <section className="stack" aria-labelledby="kontakt">
          <h2 id="kontakt">Kontakt</h2>
          <address className="adresse">
            {MARKE}
            <br />
            {VERANTWORTLICH}
            <br />
            {ADRESSE.strasse}
            <br />
            {ADRESSE.ort}
            <br />
            {ADRESSE.land}
            <br />
            <br />
            E-Mail: <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>
          </address>
        </section>
        <section className="stack" aria-labelledby="verantwortlich">
          <h2 id="verantwortlich">Verantwortlich für den Inhalt</h2>
          <p className="muted">{VERANTWORTLICH}</p>
        </section>
        <section className="stack" aria-labelledby="vermittlung">
          <h2 id="vermittlung">Vermittlung</h2>
          <p className="muted">
            {MARKE} vermittelt Wartungsverträge für Aufzüge zwischen Eigentümern oder Verwaltungen und Liftfirmen. Der Wartungsvertrag kommt
            direkt zwischen Kunde und Liftfirma zustande.
          </p>
        </section>
      </main>
    </>
  );
}
