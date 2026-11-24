"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BERATUNG_PREIS_CHF } from "@/lib/config";
import { DOKUMENT_TYPEN, DOKUMENTE_MAX_ANZAHL, DOKUMENTE_MAX_BYTES, groesseText } from "@/lib/dokumente";
import { endzeit, istArbeitstag, kalenderTage, startzeiten, terminSchluessel, terminText, wochentag } from "@/lib/termine";
import { SpamFalle } from "@/components/SpamFalle";
import { Warteliste } from "@/components/Warteliste";
import { chfRappen, inklMwst } from "@/lib/mwst";
import { imKantonZuerich } from "@/lib/zuerich";
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

type Datei = { id: number; name: string; inhalt: Blob };
let naechsteId = 1;

const ERLAUBTE_ENDUNG = /\.(pdf|jpe?g|png)$/i;
/** Fotos über 1 MB werden vor dem Hochladen verkleinert (längste Seite 2000 Pixel). */
const FOTO_GRENZE = 1024 * 1024;
const FOTO_PIXEL = 2000;

/** Grosse Fotos (z. B. vom Handy) verkleinern, damit sie in die 4 MB passen. */
async function vorbereiten(f: File): Promise<Datei> {
  const original: Datei = { id: naechsteId++, name: f.name, inhalt: f };
  if (!/^image\/(jpeg|png)$/.test(f.type) || f.size <= FOTO_GRENZE) return original;
  try {
    const bild = await createImageBitmap(f);
    const faktor = Math.min(1, FOTO_PIXEL / Math.max(bild.width, bild.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bild.width * faktor);
    canvas.height = Math.round(bild.height * faktor);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.fillStyle = "#fff"; // transparente PNG-Flächen weiss statt schwarz
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bild, 0, 0, canvas.width, canvas.height);
    bild.close();
    const klein = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!klein || klein.size >= f.size) return original;
    return { ...original, name: f.name.replace(/\.(jpe?g|png)$/i, "") + ".jpg", inhalt: klein };
  } catch {
    return original;
  }
}

export function BeratungForm({ heute, belegt }: { heute: string; belegt: string[] }) {
  const router = useRouter();
  const [fehler, setFehler] = useState<string | null>(null);
  const [gebucht, setGebucht] = useState<string | null>(null);
  const [laeuft, starten] = useTransition();
  const [datum, setDatum] = useState<string | null>(null);
  const [zeit, setZeit] = useState<string | null>(null);
  const [dateien, setDateien] = useState<Datei[]>([]);
  const [dateiHinweis, setDateiHinweis] = useState<string | null>(null);
  const [bereitet, setBereitet] = useState(false);
  // Zum Start nur im Kanton Zürich (Paket 2, Verbesserung Nr. 23): zuerst die PLZ der Liegenschaft.
  const [plz, setPlz] = useState("");
  const plzFertig = /^\d{4}$/.test(plz.trim());
  const ausserhalb = plzFertig && !imKantonZuerich(plz);
  // Rechnung an die Adresse der Liegenschaft oder eine andere Adresse (Paket 2, Verbesserung Nr. 3).
  const [rechnungGleich, setRechnungGleich] = useState(true);

  const zeiten = startzeiten();
  const besetzt = useMemo(() => new Set(belegt), [belegt]);
  const reihen = useMemo(() => wochen(kalenderTage(heute)), [heute]);
  const frei = (d: string, z: string) => !besetzt.has(terminSchluessel(d, z));
  const buchbar = (d: string) => istArbeitstag(d) && zeiten.some((z) => frei(d, z));
  const summe = dateien.reduce((s, d) => s + d.inhalt.size, 0);
  const voll = dateien.length >= DOKUMENTE_MAX_ANZAHL;

  async function hinzufuegen(auswahl: File[]) {
    setDateiHinweis(null);
    setBereitet(true);
    const liste = [...dateien];
    const probleme: string[] = [];
    for (const f of auswahl) {
      if (liste.length >= DOKUMENTE_MAX_ANZAHL) {
        probleme.push(`Höchstens ${DOKUMENTE_MAX_ANZAHL} Dokumente möglich.`);
        break;
      }
      if (!DOKUMENT_TYPEN.includes(f.type as (typeof DOKUMENT_TYPEN)[number]) && !ERLAUBTE_ENDUNG.test(f.name)) {
        probleme.push(`„${f.name}“: bitte nur PDF, JPG oder PNG.`);
        continue;
      }
      const d = await vorbereiten(f);
      if (liste.reduce((s, x) => s + x.inhalt.size, 0) + d.inhalt.size > DOKUMENTE_MAX_BYTES) {
        probleme.push(`„${f.name}“ ist zu gross: zusammen sind höchstens 4 MB möglich.`);
        continue;
      }
      liste.push(d);
    }
    setDateien(liste);
    setDateiHinweis(probleme.length ? probleme.join(" ") : null);
    setBereitet(false);
  }

  if (gebucht) {
    return (
      <div className="card" role="status">
        <h2>Danke für Ihre Buchung</h2>
        <p>
          <strong>{gebucht}</strong>
        </p>
        {dateien.length > 0 && (
          <p className="muted">{dateien.length === 1 ? "Ihr Dokument haben wir erhalten." : `Ihre ${dateien.length} Dokumente haben wir erhalten.`}</p>
        )}
        <p className="muted">
          Unsere Fachperson kommt zur angegebenen Adresse. Falls etwas dazwischenkommt, melden wir uns telefonisch bei Ihnen. Kosten:
          CHF {BERATUNG_PREIS_CHF} exkl. MWST (Fixpreis, {chfRappen(inklMwst(BERATUNG_PREIS_CHF))} inkl. MWST), per Rechnung.
        </p>
        <Link href="/" className="btn btn--outline">
          Zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <>
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
          for (const d of dateien) daten.append("dokumente", d.inhalt, d.name);
          setFehler(null);
          starten(async () => {
            let r;
            try {
              r = await beratungSenden(daten);
            } catch {
              setFehler("Die Buchung konnte nicht gesendet werden. Bitte versuchen Sie es noch einmal, allenfalls mit kleineren Dokumenten.");
              return;
            }
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
          <legend>Wo steht der Aufzug? *</legend>
          <label className="field">
            PLZ der Liegenschaft *
            <input
              name="plz"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
              placeholder="8000"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
              required
            />
          </label>
        </fieldset>

        {/* Ausserhalb des Kantons Zürich bleibt der Rest verborgen (Eingaben gehen dabei nicht verloren). */}
        <div className="stack" style={ausserhalb ? { display: "none" } : undefined}>
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
              <input name="adresse" autoComplete="street-address" placeholder="Strasse Nr., Ort" required />
            </label>
            <label className="field">
              Firma oder Verwaltung (freiwillig)
              <input name="firma" autoComplete="organization" />
            </label>
            <label className="check">
              <input type="checkbox" name="rechnung_gleich" checked={rechnungGleich} onChange={(e) => setRechnungGleich(e.target.checked)} />
              Rechnung an die Adresse der Liegenschaft
            </label>
            {!rechnungGleich && (
              <label className="field">
                Rechnungsadresse *
                <textarea name="rechnungsadresse" rows={3} placeholder={"Name oder Firma\nStrasse Nr.\nPLZ Ort"} required />
              </label>
            )}
            <label className="field">
              Anzahl Aufzüge
              <input name="anzahl" inputMode="numeric" defaultValue="1" />
            </label>
            <label className="field">
              Bemerkung
              <textarea name="bemerkung" rows={3} placeholder="z. B. Zugang über den Hintereingang" />
            </label>
          </fieldset>

          <fieldset className="group">
            <legend>Dokumente (freiwillig)</legend>
            <p className="hint">
              Zum Beispiel bisheriger Wartungsvertrag oder Offerte. PDF, JPG oder PNG, bis {DOKUMENTE_MAX_ANZAHL} Dateien, zusammen höchstens 4 MB.
            </p>
            {dateien.length > 0 && (
              <ul className="dateien">
                {dateien.map((d) => (
                  <li key={d.id}>
                    <span className="dateien__name">{d.name}</span>
                    <span className="dateien__groesse">{groesseText(d.inhalt.size)}</span>
                    <button
                      type="button"
                      className="linkbtn"
                      aria-label={`${d.name} entfernen`}
                      onClick={() => {
                        setDateien(dateien.filter((x) => x.id !== d.id));
                        setDateiHinweis(null);
                      }}
                    >
                      Entfernen
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!voll && (
              <label className={`btn btn--outline datei-knopf${bereitet ? " datei-knopf--aus" : ""}`}>
                {bereitet ? "Wird vorbereitet …" : dateien.length ? "Weiteres Dokument hinzufügen" : "Dokument auswählen"}
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  multiple
                  disabled={bereitet}
                  onChange={(e) => {
                    const auswahl = Array.from(e.currentTarget.files ?? []);
                    e.currentTarget.value = ""; // dieselbe Datei kann erneut gewählt werden
                    if (auswahl.length) void hinzufuegen(auswahl);
                  }}
                />
              </label>
            )}
            {dateien.length > 0 && (
              <p className="hint">
                {dateien.length} von {DOKUMENTE_MAX_ANZAHL} Dateien, {groesseText(summe)} von 4 MB
              </p>
            )}
            {dateiHinweis && (
              <p className="error" role="alert">
                {dateiHinweis}
              </p>
            )}
          </fieldset>

          <label className="check">
            <input type="checkbox" name="pauschale" required />
            Ich nehme zur Kenntnis: Die Beratung vor Ort kostet CHF {BERATUNG_PREIS_CHF} exkl. MWST ({chfRappen(inklMwst(BERATUNG_PREIS_CHF))} inkl. MWST),
            Fixpreis ohne Zusatzkosten, zahlbar per Rechnung.
          </label>
          <SpamFalle />
          {fehler && (
            <p className="error" role="alert">
              {fehler}
            </p>
          )}
          <button type="submit" className="btn btn--dark" disabled={laeuft || bereitet}>
            {laeuft ? "Wird gesendet …" : "Termin verbindlich buchen"}
          </button>
        </div>
      </form>

      {ausserhalb && (
        <section className="card warteliste-box" aria-live="polite">
          <h2>Zurzeit nur im Kanton Zürich</h2>
          <p className="muted">
            Die Beratung vor Ort bieten wir zum Start nur im Kanton Zürich an. Hinterlassen Sie Ihre E-Mail-Adresse. Wir melden uns, sobald wir
            in Ihrer Region beraten.
          </p>
          <Warteliste plz={plz.trim()} grund="beratung_ausserhalb" danke="Danke! Wir melden uns, sobald wir in Ihrer Region beraten." />
        </section>
      )}
    </>
  );
}
