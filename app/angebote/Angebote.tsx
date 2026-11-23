"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { fromParams } from "@/lib/anlageParams";
import {
  chf,
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
  const [laeuft, starte] = useTransition();

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

  const angebotFuer = (s: Stufe): Angebot | undefined => {
    const liste = ergebnis[s];
    return liste.find((a) => a.firma === gewaehlt[s]) ?? liste[0];
  };
  const aktuell = angebotFuer(stufe);
  const weitere = ergebnis[stufe].filter((a) => a.firma !== aktuell?.firma);

  const herstellerText = anlage.hersteller === "unbekannt" ? "Hersteller unbekannt" : anlage.hersteller;

  return (
    <main className="offers">
      <div className="offers__head">
        <h1>Ihre Angebote</h1>
        <p className="lead">
          {anlage.anzahlAufzuege} × {anlage.aufzugsart} · {anlage.haltestellen} Haltestellen{anlage.attika ? ` · ${anlage.attika === "ja" ? "mit" : "ohne"} Attika` : ""}{anlage.sicherheitsdispositiv === "ja" ? " · mit Sicherheitsdispositiv" : ""} · {herstellerText} · PLZ {anlage.plz}
        </p>
        <Link href="/anlage" className="link-muted">
          Angaben ändern
        </Link>
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
                  <p className="price-sub">pro Jahr, festes Angebot von {a.firma}</p>
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
            <table>
              <thead>
                <tr>
                  <th>Liftfirma</th>
                  <th>Preis pro Jahr</th>
                  <th>Reaktionszeit</th>
                  <th>Pikett</th>
                  <th className="right">
                    <span className="sr-only">Aktion</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {weitere.map((a) => (
                  <tr key={a.firma}>
                    <td>{a.firma}</td>
                    <td>{chf(a.preisProJahrChf)}</td>
                    <td>{a.reaktionszeitStd} Std.</td>
                    <td>{PIKETT_KURZ[a.pikett]}</td>
                    <td className="right">
                      <button type="button" className="linkbtn" onClick={() => {
                          setGewaehlt((g) => ({ ...g, [stufe]: a.firma }));
                          setGesendet(null);
                        }}>
                        Wählen
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
        <section className="summary" aria-live="polite">
          <div>
            <div className="summary__label">Ihre Wahl</div>
            <div className="summary__main">
              {STUFE_INFO[stufe].name} · {aktuell.firma} · {chf(aktuell.preisProJahrChf)} / Jahr
            </div>
            <p className="summary__note">
              {gesendet === `${stufe}:${aktuell.firma}`
                ? `Danke! Ihre Anfrage ist bei ${aktuell.firma}. Die Firma meldet sich bei Ihnen für den Vertrag.`
                : `Vermittlungsgebühr ${chf(VERMITTLUNGSGEBUEHR_CHF)}, Zahlung per Rechnung. Den Vertrag schliessen Sie direkt mit ${aktuell.firma}.`}
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
                Telefon
                <input name="telefon" type="tel" autoComplete="tel" />
              </label>
              <label className="field">
                Adresse der Liegenschaft
                <input name="adresse" autoComplete="street-address" />
              </label>
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
    </main>
  );
}
