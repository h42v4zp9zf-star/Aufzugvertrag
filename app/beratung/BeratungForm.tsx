"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BERATUNG_PREIS_CHF } from "@/lib/config";
import { endzeit, istArbeitstag, kalenderTage, startzeiten, terminSchluessel, terminText, wochentag } from "@/lib/termine";
import { beratungSenden } from "./actions";

const KURZ = ["Mo", "Di", "Mi", "Do", "Fr"];
const LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

const tagKurz = (datum: string) => `${Number(datum.slice(8, 10))}.${Number(datum.slice(5, 7))}.`;
const tagLang = (datum: string) => `${LANG[wochentag(datum)]}, ${tagKurz(datum)}`;

/** Wochen von Montag bis Freitag; Tage vor dem ersten buchbaren Tag bleiben leer. */
function wochen(tage: string[]): (string | null)[][] {
  const reihen: (string | null)[][] = [];
  let reihe: (string | null)[] | null = null;
  for (const datum of tage) {
    const w = wochentag(datum);
    if (w === 0 || w === 6) continue;
    if (!reihe || w === 1) {
      reihe = [null, null, null, null, null];
      reihen.push(reihe);
    }
    reihe[w - 1] = datum;
  }
  return reihen;
}

export function BeratungForm({ heute, belegt }: { heute: string; belegt: string[] }) {
  const router = useRouter();
  const [fehler, setFehler] = useState<string | null>(null);
  const [gebucht, setGebucht] = useState<string | null>(null);
  const [laeuft, starten] = useTransition();
  const [datum, setDatum] = useState<string | null>(null);
  const [zeit, setZeit] = useState<string | null>(null);

  const zeiten = startzeiten();
  const besetzt = useMemo(() => new Set(belegt), [belegt]);
  const reihen = useMemo(() => wochen(kalenderTage(heute)), [heute]);
  const frei = (d: string, z: string) => !besetzt.has(terminSchluessel(d, z));
  const buchbar = (d: string) => istArbeitstag(d) && zeiten.some((z) => frei(d, z));

  if (gebucht) {
    return (
      <div className="card" role="status">
        <h2>Danke für Ihre Buchung</h2>
        <p>
          <strong>{gebucht}</strong>
        </p>
        <p className="muted">
          Unsere Fachperson kommt zur angegebenen Adresse. Falls etwas dazwischenkommt, melden wir uns telefonisch bei Ihnen. Kosten:
          CHF {BERATUNG_PREIS_CHF} (Fixpreis), per Rechnung.
        </p>
        <Link href="/" className="btn btn--outline">
          Zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <form
      className="stack"
      // Ohne action={...}, damit die Eingaben nach einem Fehler stehen bleiben.
      onSubmit={(e) => {
        e.preventDefault();
        if (!datum || !zeit) {
          setFehler("Bitte wählen Sie einen Termin.");
          return;
        }
        const daten = new FormData(e.currentTarget);
        setFehler(null);
        starten(async () => {
          const r = await beratungSenden(daten);
          if (r.ok) {
            setGebucht(terminText(datum, zeit));
            return;
          }
          setFehler(r.fehler);
          if (r.vergeben) {
            // Jemand war schneller: belegte Zeiten neu laden und Auswahl zurücksetzen.
            setZeit(null);
            router.refresh();
          }
        });
      }}
    >
      <fieldset className="group">
        <legend>Termin wählen *</legend>
        <p className="hint">Montag bis Freitag, 7 bis 17 Uhr. Ein Termin dauert etwa 1 Stunde.</p>
        <div className="kalender">
          <div className="kalender__reihe" aria-hidden="true">
            {KURZ.map((k) => (
              <span key={k} className="kalender__kopf">
                {k}
              </span>
            ))}
          </div>
          {reihen.map((reihe, i) => (
            <div key={i} className="kalender__reihe">
              {reihe.map((d, j) =>
                d ? (
                  <button
                    key={d}
                    type="button"
                    className="slot"
                    aria-pressed={datum === d}
                    aria-label={`${tagLang(d)}${buchbar(d) ? "" : ", nicht verfügbar"}`}
                    disabled={!buchbar(d)}
                    onClick={() => {
                      setDatum(d);
                      setZeit(null);
                      setFehler(null);
                    }}
                  >
                    {tagKurz(d)}
                  </button>
                ) : (
                  <span key={j} />
                ),
              )}
            </div>
          ))}
        </div>

        {datum && (
          <>
            <p className="hint">Freie Zeiten am {tagLang(datum)}:</p>
            <div className="zeiten">
              {zeiten.map((z) => (
                <button
                  key={z}
                  type="button"
                  className="slot"
                  aria-pressed={zeit === z}
                  aria-label={`${z} bis ${endzeit(z)} Uhr${frei(datum, z) ? "" : ", bereits vergeben"}`}
                  disabled={!frei(datum, z)}
                  onClick={() => {
                    setZeit(z);
                    setFehler(null);
                  }}
                >
                  {z}
                </button>
              ))}
            </div>
          </>
        )}
        {datum && zeit && <p className="banner banner--ok">Ihr Termin: {terminText(datum, zeit)}</p>}
        <input type="hidden" name="termin_datum" value={datum ?? ""} />
        <input type="hidden" name="termin_zeit" value={zeit ?? ""} />
      </fieldset>

      <fieldset className="group">
        <legend>Ihre Angaben</legend>
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
          <input name="adresse" autoComplete="street-address" placeholder="Strasse Nr., PLZ Ort" required />
        </label>
        <label className="field">
          Anzahl Aufzüge
          <input name="anzahl" inputMode="numeric" defaultValue="1" />
        </label>
        <label className="field">
          Bemerkung
          <textarea name="bemerkung" rows={3} placeholder="z. B. Zugang über den Hintereingang" />
        </label>
      </fieldset>

      <label className="check">
        <input type="checkbox" name="pauschale" required />
        Ich nehme zur Kenntnis: Die Beratung vor Ort kostet CHF {BERATUNG_PREIS_CHF} (Fixpreis, ohne Zusatzkosten), zahlbar per Rechnung.
      </label>
      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}
      <button type="submit" className="btn btn--dark" disabled={laeuft}>
        {laeuft ? "Wird gesendet …" : "Termin verbindlich buchen"}
      </button>
    </form>
  );
}
