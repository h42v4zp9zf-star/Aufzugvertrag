"use client";

import { startTransition, useActionState, useState } from "react";
import { chf, PIKETT, PIKETT_STANDARD, PIKETT_TEXT, preisProAufzug, STUFEN, WARTUNGEN_PRO_STUFE, ZUSCHLAG_TEXT, type Anlage, type Pikett, type Preismodell, type PreismodellDaten, type Stufe } from "@/lib/pricing";
import { HERSTELLER, PLZ_KREISE, STUFEN_NAMEN } from "@/lib/stammdaten";
import { preiseSpeichern, type FormStatus } from "../actions";
import { Fehlerliste } from "../Formulare";

type PaketWerte = { an: boolean; grundpreis: string; reaktion: string; pikett: Pikett };
type Zuschlag = "z_halte" | "z_hydraulik" | "z_alter" | "z_brandfall" | "z_tuer";

const ZUSCHLAEGE: { key: Zuschlag; label: string; feld: keyof PreismodellDaten["zuschlaege"] }[] = (
  [
    ["z_halte", "proHaltestelleUeber4Chf"],
    ["z_hydraulik", "hydraulikChf"],
    ["z_alter", "alterUeber25JahreChf"],
    ["z_brandfall", "brandfallsteuerungChf"],
    ["z_tuer", "proKabinenabschlusstuerChf"],
  ] as const
).map(([key, feld]) => ({ key, feld, label: ZUSCHLAG_TEXT[feld] }));

// Beispielanlage für die Vorschau.
const BEISPIEL: Anlage = {
  gebaeudetyp: "Mehrfamilienhaus",
  plz: "8000",
  anzahlAufzuege: 1,
  aufzugsart: "Personenaufzug",
  antrieb: "seil",
  hersteller: "Schindler",
  haltestellen: 6,
  brandfallsteuerung: "ja",
  baujahr: 1995,
};

const START: FormStatus = { fehler: [] };
// Wie auf dem Server: Tausendertrennzeichen (2'150) und Dezimalkomma erlaubt.
const n = (v: string) => Number(v.replace(/['’\s]/g, "").replace(",", "."));

export function PreisFormular({ gespeichert, veroeffentlicht }: { gespeichert: PreismodellDaten | null; veroeffentlicht: boolean }) {
  const [status, action, laeuft] = useActionState(preiseSpeichern, START);

  const [plz, setPlz] = useState<string[]>(gespeichert?.plzPraefixe ?? []);
  const [herstellerAlle, setHerstellerAlle] = useState(gespeichert ? gespeichert.hersteller === "alle" : true);
  const [hersteller, setHersteller] = useState<string[]>(gespeichert && gespeichert.hersteller !== "alle" ? gespeichert.hersteller : []);
  const [seil, setSeil] = useState(gespeichert ? gespeichert.antriebe.includes("seil") : true);
  const [hydraulik, setHydraulik] = useState(gespeichert ? gespeichert.antriebe.includes("hydraulik") : true);
  const [pakete, setPakete] = useState<Record<Stufe, PaketWerte>>(() => {
    const init = {} as Record<Stufe, PaketWerte>;
    for (const s of STUFEN) {
      const p = gespeichert?.pakete.find((x) => x.stufe === s);
      init[s] = p
        ? { an: true, grundpreis: String(p.grundpreisChf), reaktion: String(p.reaktionszeitStd), pikett: p.pikett ?? PIKETT_STANDARD[s] }
        : { an: !gespeichert, grundpreis: "", reaktion: "", pikett: PIKETT_STANDARD[s] };
    }
    return init;
  });
  const [zuschlaege, setZuschlaege] = useState<Record<Zuschlag, string>>(() => {
    const init = {} as Record<Zuschlag, string>;
    for (const z of ZUSCHLAEGE) init[z.key] = gespeichert ? String(gespeichert.zuschlaege[z.feld]) : "0";
    return init;
  });
  const [publik, setPublik] = useState(veroeffentlicht);

  const toggle = (liste: string[], wert: string, an: boolean) => (an ? [...liste, wert] : liste.filter((x) => x !== wert));
  const setPaket = (s: Stufe, feld: keyof PaketWerte, wert: string | boolean) =>
    setPakete((p) => ({ ...p, [s]: { ...p[s], [feld]: wert } }));

  // Vorschau mit den aktuellen Eingaben.
  const vorschauModell: Preismodell = {
    firma: "Vorschau",
    plzPraefixe: plz,
    hersteller: "alle",
    antriebe: ["seil", "hydraulik"],
    pakete: [],
    zuschlaege: {
      proHaltestelleUeber4Chf: n(zuschlaege.z_halte) || 0,
      hydraulikChf: n(zuschlaege.z_hydraulik) || 0,
      alterUeber25JahreChf: n(zuschlaege.z_alter) || 0,
      brandfallsteuerungChf: n(zuschlaege.z_brandfall) || 0,
      proKabinenabschlusstuerChf: n(zuschlaege.z_tuer) || 0,
    },
    optionen: { fernueberwachung: null, verfuegbarkeit: null, ausserhalb: null },
    bewertung: 4,
  };
  const vorschau = (s: Stufe): string => {
    const p = pakete[s];
    if (!p.an) return "nicht angeboten";
    if (p.grundpreis.trim() === "" || !Number.isFinite(n(p.grundpreis))) return "–";
    const preis = preisProAufzug(vorschauModell, { stufe: s, grundpreisChf: n(p.grundpreis), reaktionszeitStd: 1, pikett: p.pikett }, BEISPIEL, []);
    return preis === null ? "–" : chf(Math.round(preis));
  };

  return (
    <form
      className="stack"
      style={{ gap: 32 }}
      // Bewusst ohne action={...}: React setzt sonst das Formular nach dem Speichern zurück,
      // und die Häkchen (Einzugsgebiet, Veröffentlichen) wären danach leer.
      onSubmit={(e) => {
        e.preventDefault();
        const daten = new FormData(e.currentTarget);
        startTransition(() => action(daten));
      }}
    >
      <Fehlerliste fehler={status.fehler} />

      <fieldset className="card group">
        <legend className="sr-only">Einzugsgebiet</legend>
        <h2>Einzugsgebiet</h2>
        <p className="muted">In welchen PLZ-Kreisen übernehmen Sie Wartungen?</p>
        <div className="checks">
          {PLZ_KREISE.map((k) => (
            <label key={k.kreis} className="check">
              <input type="checkbox" name="plz" value={k.kreis} checked={plz.includes(k.kreis)} onChange={(e) => setPlz(toggle(plz, k.kreis, e.target.checked))} />
              <span>
                PLZ {k.kreis}xxx <small>{k.region}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="card group">
        <legend className="sr-only">Anlagen</legend>
        <h2>Anlagen, die Sie warten</h2>
        <div className="checks">
          <label className="check">
            <input type="checkbox" name="antrieb_seil" checked={seil} onChange={(e) => setSeil(e.target.checked)} />
            Seilaufzüge
          </label>
          <label className="check">
            <input type="checkbox" name="antrieb_hydraulik" checked={hydraulik} onChange={(e) => setHydraulik(e.target.checked)} />
            Hydraulikaufzüge
          </label>
        </div>
        <p className="muted">Hersteller</p>
        <div className="checks">
          <label className="check">
            <input type="checkbox" name="hersteller_alle" checked={herstellerAlle} onChange={(e) => setHerstellerAlle(e.target.checked)} />
            Alle Hersteller
          </label>
          {!herstellerAlle &&
            HERSTELLER.map((h) => (
              <label key={h} className="check">
                <input type="checkbox" name="hersteller" value={h} checked={hersteller.includes(h)} onChange={(e) => setHersteller(toggle(hersteller, h, e.target.checked))} />
                {h}
              </label>
            ))}
        </div>
      </fieldset>

      <fieldset className="card group">
        <legend className="sr-only">Pakete</legend>
        <h2>Pakete und Grundpreise</h2>
        <p className="muted">Grundpreis pro Aufzug und Jahr in CHF, für einen Aufzug mit bis zu 4 Haltestellen.</p>
        <div className="pakete">
          {STUFEN.map((s) => {
            const p = pakete[s];
            return (
              <div key={s} className="stack" style={{ gap: 12 }}>
                <label className="check">
                  <input type="checkbox" name={`${s}_angeboten`} checked={p.an} onChange={(e) => setPaket(s, "an", e.target.checked)} />
                  <strong style={{ fontWeight: 500 }}>{STUFEN_NAMEN[s]}</strong>
                </label>
                {p.an && (
                  <>
                    <label className="field">
                      Grundpreis (CHF / Jahr)
                      <input name={`${s}_grundpreis`} inputMode="decimal" value={p.grundpreis} onChange={(e) => setPaket(s, "grundpreis", e.target.value)} required />
                    </label>
                    <p className="field">
                      Wartungen pro Jahr
                      <span className="fix">{WARTUNGEN_PRO_STUFE[s]} (fix vorgegeben)</span>
                    </p>
                    <label className="field">
                      Reaktionszeit bei Störung (Std.)
                      <input name={`${s}_reaktion`} inputMode="decimal" value={p.reaktion} onChange={(e) => setPaket(s, "reaktion", e.target.value)} required />
                    </label>
                    <label className="field">
                      Pikett-Deckung (Störungsdienst)
                      <select name={`${s}_pikett`} value={p.pikett} onChange={(e) => setPaket(s, "pikett", e.target.value)} required>
                        {PIKETT.map((k) => (
                          <option key={k} value={k}>
                            {PIKETT_TEXT[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="muted">
          Leistungen je Paket: Basis = 2 Wartungen pro Jahr, Inspektion, Notruf und Personenbefreiung. Standard = 4 Wartungen pro Jahr,
          zusätzlich Störungseinsätze. Komplett = 6 Wartungen pro Jahr, zusätzlich Reparaturen und Verschleissteile. Zu welchen Zeiten Ihr
          Störungsdienst ausrückt (Pikett-Deckung), wählen Sie pro Paket.
        </p>
      </fieldset>

      <fieldset className="card group">
        <legend className="sr-only">Zuschläge</legend>
        <h2>Zuschläge</h2>
        <p className="muted">In CHF pro Aufzug und Jahr, gelten für alle Pakete. 0 wenn kein Zuschlag.</p>
        <div className="grid2">
          {ZUSCHLAEGE.map((z) => (
            <label key={z.key} className="field">
              {z.label}
              <input name={z.key} inputMode="decimal" value={zuschlaege[z.key]} onChange={(e) => setZuschlaege((v) => ({ ...v, [z.key]: e.target.value }))} required />
            </label>
          ))}
        </div>
      </fieldset>

      <section className="card" aria-labelledby="vorschau">
        <h2 id="vorschau">Vorschau</h2>
        <p className="muted">
          So viel kostet bei Ihnen ein Personenaufzug mit Seilantrieb, 6 Haltestellen, Baujahr 1995 und Brandfallsteuerung:
        </p>
        <div className="preview" aria-live="polite">
          {STUFEN.map((s) => (
            <div key={s}>
              <strong>{vorschau(s)}</strong>
              <span>{STUFEN_NAMEN[s]} pro Jahr</span>
            </div>
          ))}
        </div>
      </section>

      <label className="check">
        <input type="checkbox" name="veroeffentlicht" checked={publik} onChange={(e) => setPublik(e.target.checked)} />
        Preise im Vergleich veröffentlichen (sobald Ihr Konto freigeschaltet ist)
      </label>

      <div className="row-between">
        <span className="success" role="status">
          {status.gespeichert && !laeuft ? "Gespeichert." : ""}
        </span>
        <button type="submit" className="btn btn--dark" disabled={laeuft}>
          {laeuft ? "Wird gespeichert …" : "Preise speichern"}
        </button>
      </div>
    </form>
  );
}
