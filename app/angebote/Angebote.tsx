"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { fromParams } from "@/lib/anlageParams";
import {
  chf,
  dauerText,
  fristText,
  STUFEN,
  vergleiche,
  PIKETT_STANDARD,
  VERMITTLUNGSGEBUEHR_CHF,
  WARTUNGEN_PRO_STUFE,
  type Angebot,
  type Pikett,
  type Preismodell,
  type Stufe,
} from "@/lib/pricing";
import { SpamFalle } from "@/components/SpamFalle";
import { Warteliste } from "@/components/Warteliste";
import { BERATUNG_PREIS_CHF, MARKE } from "@/lib/config";
import { chfRappen, inklMwst, inklMwstText } from "@/lib/mwst";
import { SPAM_FELD } from "@/lib/spamfalle";
import { imKantonZuerich } from "@/lib/zuerich";
import { anfrageSenden } from "./actions";

const STUFE_INFO: Record<Stufe, { name: string; tag: string }> = {
  basis: { name: "Basis", tag: "Gesetzliche Pflichten erfüllt" },
  standard: { name: "Standard", tag: "Mit Störungsdienst" },
  komplett: { name: "Komplett", tag: "Reparaturen inklusive" },
};

// Pikett-Deckung wählt jede Liftfirma pro Paket.
const PIKETT_LEISTUNG: Record<Pikett, string> = {
  "24h": "Pikett-Störungsdienst 24 Stunden",
  tag: "Pikett-Störungsdienst 7–17 Uhr",
  keine: "Kein Pikett-Störungsdienst",
};
const PIKETT_KURZ: Record<Pikett, string> = { "24h": "24 Std.", tag: "7–17 Uhr", keine: "keine" };

// Leistungen eines Pakets: Wartungen fix pro Stufe, Pikett vom Angebot der Liftfirma.
function leistungen(s: Stufe, a: Angebot | undefined): { text: string; an: boolean }[] {
  const pikett = a?.pikett ?? PIKETT_STANDARD[s];
  return [
    { text: `${WARTUNGEN_PRO_STUFE[s]} Wartungen pro Jahr, inkl. Inspektion`, an: true },
    { text: "Notruf und Personenbefreiung", an: true },
    { text: PIKETT_LEISTUNG[pikett], an: pikett !== "keine" },
    { text: "Reparaturen und Verschleissteile", an: s === "komplett" },
  ];
}

function Check({ on }: { on: boolean }) {
  return on ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="enthalten">
      <path d="M5 12l5 5L20 7" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" role="img" aria-label="nicht enthalten">
      <path d="M6 12h12" />
    </svg>
  );
}

export function Angebote({ modelle, beispiel }: { modelle: Preismodell[]; beispiel: boolean }) {
  const params = useSearchParams();
  const anlage = useMemo(() => fromParams(new URLSearchParams(params.toString())), [params]);
  const [stufe, setStufe] = useState<Stufe>("standard");
  const [gewaehlt, setGewaehlt] = useState<Record<Stufe, string | null>>({ basis: null, standard: null, komplett: null });
  const [formOffen, setFormOffen] = useState(false);
  const [gesendet, setGesendet] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // Rechnung an die Adresse der Liegenschaft oder eine andere Adresse (Paket 2, Verbesserung Nr. 3).
  const [rechnungGleich, setRechnungGleich] = useState(true);
  const [laeuft, starte] = useTransition();
  // Feste Leiste unten auf dem Handy (Verbesserung Nr. 15): sichtbar, solange „Ihre Wahl“ weiter unten liegt.
  const wahlRef = useRef<HTMLElement>(null);
  const [wahlUnten, setWahlUnten] = useState(true);
  useEffect(() => {
    const el = wahlRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const beobachter = new IntersectionObserver(([e]) => setWahlUnten(!e.isIntersecting && e.boundingClientRect.top > 0));
    beobachter.observe(el);
    return () => beobachter.disconnect();
  });

  const ergebnis = useMemo(() => (anlage ? vergleiche(anlage, modelle) : null), [anlage, modelle]);

  if (!anlage || !ergebnis) {
    return (
      <main className="offers">
        <div className="offers__head">
          <h1>Noch keine Anlage erfasst</h1>
          <p className="lead">Erfassen Sie zuerst Ihre Anlage, dann zeigen wir Ihnen passende Angebote.</p>
          <Link href="/anlage" className="btn btn--dark">
            Anlage erfassen
          </Link>
        </div>
      </main>
    );
  }

  const angabenLink = (
    <Link href={`/anlage?${params.toString()}`} className="link-muted">
      Angaben ändern
    </Link>
  );

  // Zum Start nur im Kanton Zürich (Paket 2, Verbesserung Nr. 23, Entscheid Dario 24.11.2026).
  if (!imKantonZuerich(anlage.plz)) {
    return (
      <main className="offers">
        <div className="offers__head">
          <h1>Zurzeit nur im Kanton Zürich</h1>
          <p className="lead">
            {MARKE} vergleicht Wartungsverträge zum Start nur im Kanton Zürich. Die PLZ {anlage.plz} liegt ausserhalb.
          </p>
          {angabenLink}
        </div>
        <section className="card warteliste-box">
          <h2>Wir melden uns bei Ihnen</h2>
          <p className="muted">Hinterlassen Sie Ihre E-Mail-Adresse. Wir schreiben Ihnen, sobald {MARKE} in Ihrer Region verfügbar ist.</p>
          <Warteliste plz={anlage.plz} grund="ausserhalb" danke={`Danke! Wir melden uns, sobald ${MARKE} in Ihrer Region verfügbar ist.`} />
        </section>
      </main>
    );
  }

  // Keine Sackgasse (Paket 2, Verbesserung Nr. 8): E-Mail hinterlassen oder Beratung vor Ort.
  if (!beispiel && STUFEN.every((s) => ergebnis[s].length === 0)) {
    return (
      <main className="offers">
        <div className="offers__head">
          <h1>Noch kein Angebot für Ihre Anlage</h1>
          <p className="lead">Für Ihre Anlage in {anlage.plz} hat noch keine Liftfirma ein Angebot hinterlegt.</p>
          {angabenLink}
        </div>
        <section className="card warteliste-box">
          <h2>Wir melden uns bei Ihnen</h2>
          <p className="muted">Hinterlassen Sie Ihre E-Mail-Adresse. Wir schreiben Ihnen, sobald eine Liftfirma in Ihrer Region mitmacht.</p>
          <Warteliste plz={anlage.plz} grund="kein_angebot" danke="Danke! Wir melden uns, sobald eine Liftfirma in Ihrer Region mitmacht." />
        </section>
        <section className="card warteliste-box">
          <h2>Lieber persönlich?</h2>
          <p className="muted">
            Unsere Fachperson schaut Ihre Anlage vor Ort an und berät Sie. Fixpreis {chf(BERATUNG_PREIS_CHF)} exkl. MWST.
          </p>
          <Link href="/beratung" className="btn btn--outline">
            Beratung vor Ort buchen
          </Link>
        </section>
      </main>
    );
  }

  const angebotFuer = (s: Stufe): Angebot | undefined => {
    const liste = ergebnis[s];
    return liste.find((a) => a.firma === gewaehlt[s]) ?? liste[0];
  };
  const aktuell = angebotFuer(stufe);
  const weitere = ergebnis[stufe].filter((a) => a.firma !== aktuell?.firma);

  const herstellerText = anlage.hersteller === "unbekannt" ? "Hersteller unbekannt" : anlage.hersteller;
  const anzahlLifte = Math.max(1, anlage.anzahlAufzuege);
  // Bei mehreren Aufzügen auch den Preis pro Aufzug zeigen (Verbesserung Nr. 16).
  const preisText = (a: Angebot) =>
    anzahlLifte > 1
      ? `pro Jahr für ${anzahlLifte} Aufzüge (${chf(Math.round(a.preisProJahrChf / anzahlLifte))} pro Aufzug), exkl. MWST, festes Angebot von ${a.firma}`
      : `pro Jahr exkl. MWST, festes Angebot von ${a.firma}`;
  const leisteZeigen = !!aktuell && wahlUnten && !formOffen && gesendet !== `${stufe}:${aktuell.firma}`;

  function zurWahl() {
    setFormOffen(true);
    wahlRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="offers">
      <div className="offers__head">
        <h1>Ihre Angebote</h1>
        <p className="lead">
          {anlage.anzahlAufzuege} × {anlage.aufzugsart} · {anlage.haltestellen} Haltestellen{anlage.attika ? ` · ${anlage.attika === "ja" ? "mit" : "ohne"} Attika` : ""}{anlage.sicherheitsdispositiv === "ja" ? " · mit Sicherheitsdispositiv" : ""} · {herstellerText} · PLZ {anlage.plz}
        </p>
        {angabenLink}
        {beispiel && (
          <p className="notice">Vorschau mit Beispielpreisen erfundener Liftfirmen. Echte Angebote folgen, sobald Liftfirmen ihre Preise hinterlegt haben.</p>
        )}
      </div>

      <div className="plans">
        {STUFEN.map((s) => {
          const info = STUFE_INFO[s];
          const a = angebotFuer(s);
          const aktiv = s === stufe;
          return (
            <article key={s} className={`plan${aktiv ? " plan--active" : ""}`} aria-label={`Paket ${info.name}`}>
              <div className="badge-row">{s === "standard" && <span className="badge">Empfohlen</span>}</div>
              <div>
                <h2>{info.name}</h2>
                <p className="plan__tag">{info.tag}</p>
              </div>
              {a ? (
                <div>
                  <div className="price">{chf(a.preisProJahrChf)}</div>
                  <p className="price-sub">{preisText(a)}</p>
                  <p className="price-sub">{inklMwstText(a.preisProJahrChf)}</p>
                  <p className="price-sub">
                    {ergebnis[s].length === 1 ? "1 Angebot" : `${ergebnis[s].length} Angebote`} in dieser Stufe
                  </p>
                </div>
              ) : (
                <p className="empty">Für Ihre Anlage gibt es in dieser Stufe noch kein Angebot.</p>
              )}
              <ul className="features">
                {leistungen(s, a).map((l) => (
                  <li key={l.text} className={l.an ? "" : "off"}>
                    <Check on={l.an} />
                    <span>{l.text}</span>
                  </li>
                ))}
              </ul>
              {a && (
                <div className="metrics">
                  <div>
                    <strong>{a.reaktionszeitStd} Std.</strong>Reaktionszeit Störung
                  </div>
                  <div>
                    <strong>{a.vertragsdauerJahre ? dauerText(a.vertragsdauerJahre) : "Nicht angegeben"}</strong>Vertragsdauer
                  </div>
                  {a.vertragsdauerJahre && a.kuendigungsfristMonate && (
                    <div>
                      <strong>{fristText(a.kuendigungsfristMonate)}</strong>Kündigungsfrist
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                className={`btn ${aktiv ? "btn--dark" : "btn--outline"}`}
                aria-pressed={aktiv}
                disabled={!a}
                onClick={() => {
                  setStufe(s);
                  setGesendet(null);
                }}
              >
                {aktiv ? "Ausgewählt" : "Dieses Paket wählen"}
              </button>
            </article>
          );
        })}
      </div>

      <section className="block" aria-labelledby="weitere">
        <h2 id="weitere">Weitere Angebote in {STUFE_INFO[stufe].name}</h2>
        {weitere.length === 0 ? (
          <p className="empty">Keine weiteren Angebote in dieser Stufe.</p>
        ) : (
          <div className="table-wrap">
            <table className="tabelle-karten">
              <thead>
                <tr>
                  <th>Liftfirma</th>
                  <th>Preis pro Jahr exkl. MWST</th>
                  <th>Reaktionszeit</th>
                  <th>Pikett</th>
                  <th>Vertragsdauer</th>
                  <th>Kündigungsfrist</th>
                  <th className="right">
                    <span className="sr-only">Aktion</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {weitere.map((a) => (
                  <tr key={a.firma}>
                    <td data-label="Liftfirma">{a.firma}</td>
                    <td data-label="Preis pro Jahr exkl. MWST">{chf(a.preisProJahrChf)}</td>
                    <td data-label="Reaktionszeit">{a.reaktionszeitStd} Std.</td>
                    <td data-label="Pikett">{PIKETT_KURZ[a.pikett]}</td>
                    <td data-label="Vertragsdauer">{a.vertragsdauerJahre ? dauerText(a.vertragsdauerJahre) : "nicht angegeben"}</td>
                    <td data-label="Kündigungsfrist">{a.vertragsdauerJahre && a.kuendigungsfristMonate ? fristText(a.kuendigungsfristMonate) : "–"}</td>
                    <td className="right">
                      <button type="button" className="linkbtn" onClick={() => {
                          setGewaehlt((g) => ({ ...g, [stufe]: a.firma }));
                          setGesendet(null);
                        }}>
                        Wählen<span className="sr-only">: {a.firma}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {aktuell && (
        <section className="summary" aria-live="polite" ref={wahlRef}>
          <div>
            <div className="summary__label">Ihre Wahl</div>
            <div className="summary__main">
              {STUFE_INFO[stufe].name} · {aktuell.firma} · {chf(aktuell.preisProJahrChf)} / Jahr exkl. MWST
            </div>
            <p className="summary__note">
              {gesendet === `${stufe}:${aktuell.firma}`
                ? `Danke! Ihre Anfrage ist bei ${aktuell.firma}. Die Firma meldet sich bei Ihnen für den Vertrag.`
                : `${inklMwstText(aktuell.preisProJahrChf)} pro Jahr. Den Vertrag schliessen Sie direkt mit ${aktuell.firma}. Kommt er zustande, kostet die Vermittlung ${chf(VERMITTLUNGSGEBUEHR_CHF)} exkl. MWST, per Rechnung.`}
            </p>
          </div>
          {gesendet !== `${stufe}:${aktuell.firma}` && !formOffen && (
            <button type="button" className="btn btn--dark" onClick={() => setFormOffen(true)}>
              Angebot annehmen
            </button>
          )}
          {formOffen && gesendet !== `${stufe}:${aktuell.firma}` && (
            <form
              className="contact"
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setFehler(null);
                if (beispiel || aktuell.firmaId === undefined) {
                  setFehler("Dies ist eine Vorschau mit Beispielpreisen. Anfragen sind erst mit echten Angeboten möglich.");
                  return;
                }
                const ziel = `${stufe}:${aktuell.firma}`;
                starte(async () => {
                  const r = await anfrageSenden({
                    anlageParams: params.toString(),
                    firmaId: aktuell.firmaId!,
                    stufe,
                    name: String(f.get("name") ?? ""),
                    email: String(f.get("email") ?? ""),
                    telefon: String(f.get("telefon") ?? ""),
                    adresse: String(f.get("adresse") ?? ""),
                    firma: String(f.get("firma") ?? ""),
                    rechnungAndere: !rechnungGleich,
                    rechnungsadresse: rechnungGleich ? "" : String(f.get("rechnungsadresse") ?? ""),
                    gebuehrBestaetigt: f.get("gebuehr") === "on",
                    webseite: String(f.get(SPAM_FELD) ?? ""),
                  });
                  if (r.ok) {
                    setGesendet(ziel);
                    setFormOffen(false);
                  } else {
                    setFehler(r.fehler);
                  }
                });
              }}
            >
              <label className="field">
                Name *
                <input name="name" autoComplete="name" required />
              </label>
              <label className="field">
                E-Mail *
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="field">
                Telefon *
                <input name="telefon" type="tel" autoComplete="tel" required />
              </label>
              <label className="field">
                Adresse der Liegenschaft *
                <input name="adresse" autoComplete="street-address" placeholder={`Strasse Nr., ${anlage.plz} Ort`} required />
              </label>
              <label className="field">
                Firma oder Verwaltung (freiwillig)
                <input name="firma" autoComplete="organization" />
              </label>
              <label className="check" style={{ gridColumn: "1 / -1" }}>
                <input type="checkbox" checked={rechnungGleich} onChange={(e) => setRechnungGleich(e.target.checked)} />
                Rechnung an die Adresse der Liegenschaft
              </label>
              {!rechnungGleich && (
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  Rechnungsadresse *
                  <textarea name="rechnungsadresse" rows={3} placeholder={"Name oder Firma\nStrasse Nr.\nPLZ Ort"} required />
                </label>
              )}
              <label className="check" style={{ gridColumn: "1 / -1" }}>
                <input type="checkbox" name="gebuehr" required />
                Ich nehme zur Kenntnis: Kommt der Vertrag zustande, kostet die Vermittlung {chf(VERMITTLUNGSGEBUEHR_CHF)} exkl. MWST (
                {chfRappen(inklMwst(VERMITTLUNGSGEBUEHR_CHF))} inkl. MWST), zahlbar per Rechnung.
              </label>
              <SpamFalle />
              {fehler && (
                <p className="error" role="alert" style={{ gridColumn: "1 / -1" }}>
                  {fehler}
                </p>
              )}
              <button type="submit" className="btn btn--dark" disabled={laeuft} style={{ gridColumn: "1 / -1" }}>
                {laeuft ? "Wird gesendet …" : "Verbindlich anfragen"}
              </button>
            </form>
          )}
        </section>
      )}

      {aktuell && leisteZeigen && (
        <div className="wahl-leiste" role="region" aria-label="Ihre Wahl">
          <div className="wahl-leiste__text">
            <strong>
              {STUFE_INFO[stufe].name} · {chf(aktuell.preisProJahrChf)} / Jahr
            </strong>
            <span>exkl. MWST · {aktuell.firma}</span>
          </div>
          <button type="button" className="btn btn--dark" onClick={zurWahl}>
            Angebot annehmen
          </button>
        </div>
      )}
    </main>
  );
}
