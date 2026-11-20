import Link from "next/link";
import { Header, MARKE } from "@/components/Header";

export default function Startseite() {
  return (
    <>
      <Header variant="overlay" />
      <main>
        <section className="hero">
          <div className="hero__text">
            <h1>Aufzugswartung. Fair verglichen.</h1>
            <p className="lead">
              Anlage einmal erfassen, feste Angebote von Schweizer Liftfirmen vergleichen und den
              passenden Wartungsvertrag wählen.
            </p>
          </div>
          <div className="placeholder" aria-hidden="true">
            Bild: Aufzugskabine in Schwarzweiss
          </div>
          <div className="btn-row">
            <Link href="/anlage" className="btn btn--dark btn--wide">
              Angebote vergleichen
            </Link>
            <a href="#beratung" className="btn btn--outline btn--wide">
              Beratung vor Ort buchen
            </a>
          </div>
        </section>

        <section id="ablauf" className="section divider">
          <div className="hero__text">
            <h2 style={{ fontSize: 36, fontWeight: 500 }}>In drei Schritten zum Vertrag</h2>
            <p className="lead">Für Eigentümer, Stockwerkeigentümer und Verwaltungen.</p>
          </div>
          <div className="steps">
            <div>
              <div className="steps__num">01</div>
              <h3>Anlage erfassen</h3>
              <p>
                Gebäude, Aufzugsart, Antrieb, Haltestellen und Brandfallsteuerung. Was Sie nicht
                wissen, lassen Sie offen.
              </p>
            </div>
            <div>
              <div className="steps__num">02</div>
              <h3>Pakete vergleichen</h3>
              <p>
                Basis, Standard oder Komplett: pro Stufe das beste feste Angebot, mit allen
                enthaltenen Leistungen.
              </p>
            </div>
            <div>
              <div className="steps__num">03</div>
              <h3>Vertrag abschliessen</h3>
              <p>
                Angebot wählen, wir vermitteln. Den Vertrag schliessen Sie direkt mit der
                Liftfirma.
              </p>
            </div>
          </div>
          <Link href="/anlage" className="btn btn--dark">
            Jetzt starten
          </Link>
        </section>

        <section id="beratung" className="hero hero--compact divider">
          <div className="hero__text">
            <h2>Keine Anlagedaten zur Hand?</h2>
            <p className="lead">
              Unsere Fachperson kommt vorbei, erfasst die Anlage und erstellt Ihren Vergleich.
              Anfangspauschale CHF 130, danach nach Aufwand.
            </p>
          </div>
          <div className="placeholder" aria-hidden="true">
            Bild: Techniker im Maschinenraum
          </div>
          <div className="btn-row">
            <a href="mailto:[KONTAKT-E-MAIL]?subject=Beratung%20vor%20Ort" className="btn btn--dark btn--wide">
              Beratung buchen
            </a>
            <a href="#ablauf" className="btn btn--outline btn--wide">
              Mehr erfahren
            </a>
          </div>
        </section>

        <section id="partner" className="section section--compact divider">
          <h2 style={{ fontSize: 36, fontWeight: 500 }}>Für Liftfirmen</h2>
          <p className="lead">
            Preismodell einmal im Portal hinterlegen. Passende Anfragen erhalten Sie mit fertig
            berechnetem Angebot, ohne einzelne Offerten zu schreiben.
          </p>
          <div className="btn-row">
            <a href="mailto:[KONTAKT-E-MAIL]?subject=Partner%20werden" className="btn btn--dark btn--wide">
              Partner werden
            </a>
            <span className="btn btn--outline btn--wide" aria-disabled="true">
              Partner-Login (folgt)
            </span>
          </div>
        </section>
      </main>
      <footer className="footer">
        <span>{MARKE} © 2026</span>
        <a href="#ablauf">Datenschutz</a>
        <a href="#ablauf">Impressum</a>
      </footer>
    </>
  );
}
