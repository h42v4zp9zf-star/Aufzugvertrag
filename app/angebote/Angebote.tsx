"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { fromParams } from "@/lib/anlageParams";
import { BEISPIELMODELLE } from "@/lib/beispielmodelle";
import {
  chf,
  STUFEN,
  vergleiche,
  VERMITTLUNGSGEBUEHR_CHF,
  type Angebot,
  type OptionKey,
  type Stufe,
} from "@/lib/pricing";

const STUFE_INFO: Record<Stufe, { name: string; tag: string; leistungen: number }> = {
  basis: { name: "Basis", tag: "Gesetzliche Pflichten erfüllt", leistungen: 2 },
  standard: { name: "Standard", tag: "Hilfe rund um die Uhr", leistungen: 3 },
  komplett: { name: "Komplett", tag: "Reparaturen inklusive", leistungen: 4 },
};

const LEISTUNGEN = [
  "Wartung und Inspektion",
  "Notruf und Personenbefreiung",
  "Störungseinsätze 24/7",
  "Reparaturen und Verschleissteile",
];

const OPTIONEN: { key: OptionKey; label: string }[] = [
  { key: "fernueberwachung", label: "Fernüberwachung" },
  { key: "verfuegbarkeit", label: "Verfügbarkeitsgarantie 99,5 %" },
  { key: "ausserhalb", label: "Einsätze ausserhalb der Geschäftszeiten" },
];

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

export function Angebote() {
  const params = useSearchParams();
  const anlage = useMemo(() => fromParams(new URLSearchParams(params.toString())), [params]);
  const [optionen, setOptionen] = useState<OptionKey[]>([]);
  const [stufe, setStufe] = useState<Stufe>("standard");
  const [gewaehlt, setGewaehlt] = useState<Record<Stufe, string | null>>({ basis: null, standard: null, komplett: null });
  const [angenommen, setAngenommen] = useState(false);

  const ergebnis = useMemo(() => (anlage ? vergleiche(anlage, BEISPIELMODELLE, optionen) : null), [anlage, optionen]);

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

  const toggle = (k: OptionKey) =>
    setOptionen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));

  const optionPreis = (k: OptionKey): string => {
    if (!aktuell) return "";
    const m = BEISPIELMODELLE.find((x) => x.firma === aktuell.firma);
    const p = m?.optionen[k];
    return p == null ? "bei dieser Firma nicht verfügbar" : `+ ${chf(p * anlage.anzahlAufzuege)} / Jahr`;
  };

  const herstellerText = anlage.hersteller === "unbekannt" ? "Hersteller unbekannt" : anlage.hersteller;

  return (
    <main className="offers">
      <div className="offers__head">
        <h1>Ihre Angebote</h1>
        <p className="lead">
          {anlage.anzahlAufzuege} × {anlage.aufzugsart} · {anlage.haltestellen} Haltestellen · {herstellerText} · PLZ {anlage.plz}
        </p>
        <Link href="/anlage" className="link-muted">
          Angaben ändern
        </Link>
        <p className="notice">Vorschau mit Beispielpreisen erfundener Liftfirmen. Echte Angebote folgen, sobald Liftfirmen ihre Preise hinterlegt haben.</p>
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
                <p className="empty">Für Ihre Anlage und die gewählten Optionen gibt es in dieser Stufe noch kein Angebot.</p>
              )}
              <ul className="features">
                {LEISTUNGEN.map((l, i) => {
                  const on = i < info.leistungen;
                  return (
                    <li key={l} className={on ? "" : "off"}>
                      <Check on={on} />
                      <span>{l}</span>
                    </li>
                  );
                })}
              </ul>
              {a && (
                <div className="metrics">
                  <div>
                    <strong>{a.wartungenProJahr}</strong>Wartungen pro Jahr
                  </div>
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
                onClick={() => setStufe(s)}
              >
                {aktiv ? "Ausgewählt" : "Dieses Paket wählen"}
              </button>
            </article>
          );
        })}
      </div>

      <section className="block" aria-labelledby="optionen">
        <h2 id="optionen">Zusatzoptionen</h2>
        <div className="addons">
          {OPTIONEN.map((o) => (
            <label key={o.key} className="addon">
              <span>
                <input type="checkbox" checked={optionen.includes(o.key)} onChange={() => toggle(o.key)} />
                {o.label}
              </span>
              <span className="muted">{optionPreis(o.key)}</span>
            </label>
          ))}
        </div>
      </section>

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
                  <th>Wartungen</th>
                  <th>Reaktionszeit</th>
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
                    <td>{a.wartungenProJahr}</td>
                    <td>{a.reaktionszeitStd} Std.</td>
                    <td className="right">
                      <button type="button" className="linkbtn" onClick={() => setGewaehlt((g) => ({ ...g, [stufe]: a.firma }))}>
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
              {angenommen
                ? "Danke! In der fertigen Version leiten wir Ihre Anfrage jetzt an die Liftfirma weiter."
                : `Vermittlungsgebühr ${chf(VERMITTLUNGSGEBUEHR_CHF)}, Zahlung per Rechnung. Den Vertrag schliessen Sie direkt mit ${aktuell.firma}.`}
            </p>
          </div>
          <button type="button" className="btn btn--dark" onClick={() => setAngenommen(true)} disabled={angenommen}>
            {angenommen ? "Angefragt" : "Angebot annehmen"}
          </button>
        </section>
      )}
    </main>
  );
}
