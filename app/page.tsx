import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BERATUNG_PREIS_CHF } from "@/lib/config";

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
          <div className="hero__bild">
            <Image
              src="/bilder/aufzugsschacht.jpg"
              alt="Gläserner Aufzugsschacht, von unten gesehen"
              fill
              priority
              sizes="(max-width: 688px) 100vw, 640px"
            />
          </div>
          <div className="btn-row">
            <Link href="/anlage" className="btn btn--dark btn--wide">
              Angebote vergleichen
            </Link>
            <Link href="/beratung" className="btn btn--outline btn--wide">
              Beratung vor Ort buchen
            </Link>
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
              Fixpreis CHF {BERATUNG_PREIS_CHF}, ohne Zusatzkosten. Termin direkt online wählen.
            </p>
          </div>
          <div className="hero__bild">
            <Image
              src="/bilder/maschinenraum.jpg"
              alt="Maschinenraum mit Aufzugsantrieb und Steuerschränken"
              fill
              style={{ objectPosition: "50% 58%" }}
              sizes="(max-width: 688px) 100vw, 640px"
            />
          </div>
          <div className="btn-row">
            <Link href="/beratung" className="btn btn--dark btn--wide">
              Beratung buchen
            </Link>
            <Link href="/anlagedaten" className="btn btn--outline btn--wide">
              Mehr erfahren
            </Link>
          </div>
        </section>

        <section id="partner" className="section section--compact divider">
          <h2 style={{ fontSize: 36, fontWeight: 500 }}>Für Liftfirmen</h2>
          <p className="lead">
            Preismodell einmal im Portal hinterlegen. Passende Anfragen erhalten Sie mit fertig
            berechnetem Angebot, ohne einzelne Offerten zu schreiben.
          </p>
          <div className="btn-row">
            <Link href="/partner/registrieren" className="btn btn--dark btn--wide">
              Partner werden
            </Link>
            <Link href="/partner/login" className="btn btn--outline btn--wide">
              Partner-Login
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
