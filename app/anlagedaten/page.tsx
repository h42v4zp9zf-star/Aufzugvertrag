import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MARKE } from "@/lib/config";

export const metadata: Metadata = {
  title: `Wo finde ich die Angaben zu meinem Aufzug? – ${MARKE}`,
  description: "Typenschild, Maschinenraum, Wartungsvertrag, Kontrollberichte: hier finden Sie die Angaben zu Ihrer Aufzugsanlage.",
};

// Inhalt von Dario bestätigt am 23.11.2026.
const FUNDORTE = [
  { titel: "Typenschild in der Kabine", text: "Hersteller, Baujahr, Traglast." },
  { titel: "Maschinenraum oder Schaltschrank", text: "Antrieb (Seil oder Hydraulik), Typenschild am Antrieb." },
  { titel: "Bisheriger Wartungsvertrag", text: "Vertrag und Rechnungen der Liftfirma." },
  { titel: "Kontrollberichte", text: "Berichte der periodischen Kontrolle." },
  { titel: "Liegenschaftsverwaltung oder Hauswart", text: "Dort liegen oft die Unterlagen zur Anlage." },
  { titel: "Haltestellen", text: "Alle Stockwerke, an denen der Lift hält, auch Keller und Attika." },
];

const LINKS = [
  {
    titel: "VSA – Verband Schweizerischer Aufzugsunternehmen",
    text: "Allgemeine Informationen zu Aufzugsanlagen.",
    href: "https://www.aufzuege.ch/",
  },
  {
    titel: "Stadt Zürich – Periodische Kontrollen von Aufzugsanlagen",
    text: "Informationen der Stadt Zürich zu den periodischen Kontrollen.",
    href: "https://www.stadt-zuerich.ch/de/planen-und-bauen/baubewilligungen/periodische-kontrollen/aufzugsanlagen.html",
  },
];

export default function Anlagedaten() {
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
      <main className="portal portal--text">
        <div className="stack">
          <h1>Wo finde ich die Angaben zu meinem Aufzug?</h1>
          <p className="muted">Die meisten Angaben für den Vergleich finden Sie an diesen Stellen:</p>
        </div>

        <ul className="fundorte">
          {FUNDORTE.map((f) => (
            <li key={f.titel}>
              <strong>{f.titel}</strong>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <section className="stack" aria-labelledby="weitere">
          <h2 id="weitere">Weitere Informationen</h2>
          <ul className="fundorte">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="fundorte__link">
                  {l.titel}
                  <span aria-hidden="true"> ↗</span>
                  <span className="sr-only"> (öffnet in neuem Fenster)</span>
                </a>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="btn-row btn-row--start">
          <Link href="/anlage" className="btn btn--dark btn--wide">
            Anlage erfassen
          </Link>
          <Link href="/beratung" className="btn btn--outline btn--wide">
            Beratung vor Ort buchen
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
