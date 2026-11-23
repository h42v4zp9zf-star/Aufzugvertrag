"use client";

// Checkliste für die Beratung vor Ort (Inhalt von Dario bestätigt, 23.11.2026).
// Jede Änderung wird sofort auf dem Gerät gesichert und danach hochgeladen. Ohne Empfang
// (z. B. im Maschinenraum) bleibt alles auf dem Gerät und wird später automatisch nachgeschickt.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { HerstellerWahl } from "@/app/anlage/HerstellerWahl";
import {
  AUFZUEGE_MAX,
  FOTO_STELLEN,
  FOTOS_MAX,
  ROLLEN,
  ZUSTAND_PUNKTE,
  checklisteBereinigen,
  leererAufzug,
  pflichtFehler,
  type AufzugCheck,
  type ChecklisteDaten,
  type FotoStelle,
} from "@/lib/checkliste";
import { fotoMerken, fotoVergessen, wartendeFotos } from "@/lib/fotoSpeicher";
import { fotoVorbereiten, neueId } from "@/lib/fotoVerkleinern";
import { AUFZUGSARTEN, GEBAEUDETYPEN } from "@/lib/stammdaten";
import { Unterschrift } from "./Unterschrift";

export interface BeratungKopf {
  id: number;
  name: string;
  email: string;
  telefon: string;
  adresse: string;
  anzahlAufzuege: number;
  termin: string | null;
  bemerkung: string;
}

type Status = "gespeichert" | "speichert" | "offline" | "fehler" | "anmelden";

const JA_NEIN = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
] as const;
const JA_NEIN_UNBEKANNT = [...JA_NEIN, { value: "unbekannt", label: "Unbekannt" }] as const;
const BEWERTUNGEN = [
  { value: "gut", label: "Gut" },
  { value: "mittel", label: "Mittel" },
  { value: "schlecht", label: "Schlecht" },
] as const;
const WICHTIG = [
  { value: "wichtig", label: "Wichtig" },
  { value: "egal", label: "Nicht so wichtig" },
] as const;
const PAKETE = [
  { value: "basis", label: "Basis (2 Wartungen)" },
  { value: "standard", label: "Standard (4)" },
  { value: "komplett", label: "Komplett (6)" },
] as const;

// ---- kleine Bausteine -------------------------------------------------------

function Wahl<T extends string>({
  label,
  optionen,
  wert,
  setzen,
}: {
  label: string;
  optionen: readonly { value: T; label: string }[];
  wert: string;
  setzen: (v: T | "") => void;
}) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="wahl">
        {optionen.map((o) => (
          <button
            key={o.value}
            type="button"
            className="choice"
            aria-pressed={wert === o.value}
            onClick={() => setzen(wert === o.value ? "" : o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Feld({
  label,
  wert,
  setzen,
  typ = "text",
  zahl = false,
  breit = false,
  platzhalter,
}: {
  label: string;
  wert: string;
  setzen: (v: string) => void;
  typ?: "text" | "date" | "tel";
  zahl?: boolean;
  breit?: boolean;
  platzhalter?: string;
}) {
  return (
    <label className={`field${breit ? " field--breit" : ""}`}>
      {label}
      <input
        type={typ}
        value={wert}
        inputMode={zahl ? "decimal" : undefined}
        placeholder={platzhalter}
        maxLength={200}
        onChange={(e) => setzen(e.target.value)}
      />
    </label>
  );
}

function Text({ label, wert, setzen, platzhalter }: { label: string; wert: string; setzen: (v: string) => void; platzhalter?: string }) {
  return (
    <label className="field field--breit">
      {label}
      <textarea rows={3} value={wert} maxLength={2000} placeholder={platzhalter} onChange={(e) => setzen(e.target.value)} />
    </label>
  );
}

function Abschnitt({ id, titel, children, hinweis }: { id: string; titel: string; children: ReactNode; hinweis?: string }) {
  return (
    <section className="card" id={id} aria-labelledby={`${id}-titel`}>
      <h2 id={`${id}-titel`}>{titel}</h2>
      {hinweis && <p className="muted">{hinweis}</p>}
      {children}
    </section>
  );
}

// ---- Formular ---------------------------------------------------------------

export function ChecklisteForm({ beratung, start, serverFotos }: { beratung: BeratungKopf; start: ChecklisteDaten; serverFotos: string[] }) {
  const bid = beratung.id;
  const SPEICHER = `elevaris-checkliste-${bid}`;
  const [daten, setDaten] = useState(start);
  const [status, setStatus] = useState<Status>("gespeichert");
  const [wartend, setWartend] = useState(0);
  const [aufServer, setAufServer] = useState(() => new Set(serverFotos));
  const [lokal, setLokal] = useState<Record<string, string>>({});
  const [fotoHinweis, setFotoHinweis] = useState<string | null>(null);
  const [abschlussFehler, setAbschlussFehler] = useState<string[]>([]);
  const [entfernen, setEntfernen] = useState<string | null>(null);

  const datenRef = useRef(daten);
  const version = useRef(0);
  const gespeichert = useRef(0);
  const laeuft = useRef(false);
  const nochmal = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const erster = useRef(true);

  const lokalSichern = useCallback(
    (d: ChecklisteDaten, sauber: boolean) => {
      try {
        localStorage.setItem(SPEICHER, JSON.stringify({ daten: d, sauber, zeit: Date.now() }));
      } catch {
        // Speicher voll oder gesperrt: dann bleibt es beim Hochladen
      }
    },
    [SPEICHER],
  );

  const anzahlWartend = useCallback(async () => {
    const ids = new Set(datenRef.current.fotos.map((f) => f.id));
    return (await wartendeFotos(bid)).filter((f) => ids.has(f.id)).length;
  }, [bid]);

  const synchronisieren = useCallback(async () => {
    if (laeuft.current) {
      nochmal.current = true;
      return;
    }
    laeuft.current = true;
    try {
      do {
        nochmal.current = false;
        if (version.current !== gespeichert.current) {
          const v = version.current;
          const stand = datenRef.current;
          setStatus("speichert");
          const res = await fetch(`/api/admin/beratung/${bid}/checkliste`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ daten: stand }),
          });
          if (res.status === 401) {
            setStatus("anmelden");
            return;
          }
          if (!res.ok) throw new Error(`Server ${res.status}`);
          const j = (await res.json()) as { fotos: string[]; abgeschlossenAm: string; fehlt: string[] };
          gespeichert.current = v;
          setAufServer(new Set(j.fotos));
          if (v === version.current) lokalSichern(stand, true);
          if (j.fehlt.length > 0) setAbschlussFehler(j.fehlt);
        }

        // Nur Fotos hochladen, die in der Checkliste stehen. Andere bleiben auf dem Gerät liegen
        // (z. B. wenn der Entwurf noch geladen wird) und werden nie stillschweigend gelöscht.
        const ids = new Set(datenRef.current.fotos.map((f) => f.id));
        for (const f of await wartendeFotos(bid)) {
          if (!ids.has(f.id)) continue;
          const fd = new FormData();
          fd.set("fotoId", f.id);
          fd.set("gross", f.gross, "gross.jpg");
          fd.set("klein", f.klein, "klein.jpg");
          const r = await fetch(`/api/admin/beratung/${bid}/foto`, { method: "POST", body: fd });
          if (r.status === 401) {
            setStatus("anmelden");
            return;
          }
          if (r.ok) {
            await fotoVergessen(f.id);
            setAufServer((s) => new Set(s).add(f.id));
          } else if (r.status === 400 || r.status === 409) {
            await fotoVergessen(f.id);
            const j = (await r.json().catch(() => ({}))) as { fehler?: string };
            setFotoHinweis(j.fehler ?? "Ein Foto konnte nicht gespeichert werden.");
          } else {
            throw new Error(`Server ${r.status}`);
          }
        }
        setWartend(await anzahlWartend());
      } while (nochmal.current || version.current !== gespeichert.current);
      setStatus("gespeichert");
    } catch {
      setStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "fehler");
      setWartend(await anzahlWartend());
    } finally {
      laeuft.current = false;
    }
  }, [bid, lokalSichern, anzahlWartend]);

  // Beim Öffnen: Entwurf auf diesem Gerät, der noch nicht hochgeladen ist, hat Vorrang.
  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      const e = roh ? (JSON.parse(roh) as { daten?: unknown; sauber?: boolean }) : null;
      if (e && e.sauber === false && e.daten) {
        const entwurf = checklisteBereinigen(e.daten, beratung.anzahlAufzuege);
        datenRef.current = entwurf; // sofort, damit das Hochladen schon mit dem Entwurf arbeitet
        version.current += 1;
        setDaten(entwurf);
      }
    } catch {
      // kein Entwurf
    }
    wartendeFotos(bid).then((liste) => {
      const ids = new Set(datenRef.current.fotos.map((f) => f.id));
      setWartend(liste.filter((f) => ids.has(f.id)).length);
      setLokal((alt) => ({ ...alt, ...Object.fromEntries(liste.map((f) => [f.id, URL.createObjectURL(f.klein)])) }));
      if (liste.length || version.current !== gespeichert.current) void synchronisieren();
    });
    const online = () => void synchronisieren();
    window.addEventListener("online", online);
    // Regelmässig nachschauen, ob noch etwas hochzuladen ist (ohne Empfang kommt kein „online“-Ereignis).
    const wieder = window.setInterval(() => void synchronisieren(), 20000);
    return () => {
      window.removeEventListener("online", online);
      window.clearInterval(wieder);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jede Änderung: sofort auf dem Gerät sichern, kurz danach hochladen.
  useEffect(() => {
    if (erster.current) {
      erster.current = false;
      return;
    }
    datenRef.current = daten;
    version.current += 1;
    lokalSichern(daten, false);
    // Sofort anzeigen, dass noch etwas hochgeladen werden muss (ohne Empfang bleibt die Meldung stehen).
    setStatus((s) => (s === "gespeichert" ? "speichert" : s));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void synchronisieren(), 1000);
  }, [daten, lokalSichern, synchronisieren]);

  function aendern(fn: (d: ChecklisteDaten) => void) {
    setDaten((alt) => {
      const neu = structuredClone(alt);
      fn(neu);
      if (neu.abschluss.abgeschlossenAm && pflichtFehler(neu).length > 0) neu.abschluss.abgeschlossenAm = "";
      return neu;
    });
  }
  const aufzugAendern = (id: string, fn: (a: AufzugCheck) => void) =>
    aendern((d) => {
      const a = d.aufzuege.find((x) => x.id === id);
      if (a) fn(a);
    });

  async function fotosHinzufuegen(aufzug: string, stelle: FotoStelle, dateien: File[]) {
    setFotoHinweis(null);
    let anzahl = datenRef.current.fotos.length;
    for (const datei of dateien) {
      if (anzahl >= FOTOS_MAX) {
        setFotoHinweis(`Höchstens ${FOTOS_MAX} Fotos pro Beratung.`);
        break;
      }
      try {
        const { gross, klein } = await fotoVorbereiten(datei);
        const id = neueId();
        await fotoMerken({ id, beratungId: bid, gross, klein });
        setLokal((l) => ({ ...l, [id]: URL.createObjectURL(klein) }));
        setWartend((w) => w + 1);
        anzahl += 1;
        aendern((d) => {
          d.fotos.push({ id, aufzug, stelle, notiz: "" });
        });
      } catch {
        setFotoHinweis(`„${datei.name}“ konnte nicht als Foto gelesen werden.`);
      }
    }
  }

  function fotoEntfernen(id: string) {
    aendern((d) => {
      d.fotos = d.fotos.filter((f) => f.id !== id);
    });
    void fotoVergessen(id);
    setLokal((l) => {
      if (l[id]) URL.revokeObjectURL(l[id]);
      const { [id]: _weg, ...rest } = l;
      return rest;
    });
  }

  function aufzugHinzufuegen() {
    aendern((d) => {
      if (d.aufzuege.length >= AUFZUEGE_MAX) return;
      d.aufzuege.push(leererAufzug(neueId().slice(0, 12), d.aufzuege.length + 1));
    });
  }

  function aufzugEntfernen(id: string) {
    for (const f of datenRef.current.fotos.filter((x) => x.aufzug === id)) fotoEntfernen(f.id);
    aendern((d) => {
      d.aufzuege = d.aufzuege.filter((a) => a.id !== id);
    });
    setEntfernen(null);
  }

  function abschliessen() {
    const fehler = pflichtFehler(daten);
    setAbschlussFehler(fehler);
    if (fehler.length) return;
    aendern((d) => {
      d.abschluss.abgeschlossenAm = new Date().toISOString();
    });
  }

  const d = daten;
  const alles = status === "gespeichert" && wartend === 0;
  const abgeschlossen = !!d.abschluss.abgeschlossenAm;
  const berichtUrl = `/api/admin/beratung/${bid}/bericht`;

  return (
    <>
      <div className="checkliste__kopf">
        <Link href="/admin" className="link-muted">
          ← Zurück zur Verwaltung
        </Link>
        <h1>Checkliste Beratung vor Ort</h1>
        <p className="muted">
          {beratung.name}
          {beratung.termin ? ` · ${beratung.termin}` : ""}
        </p>
      </div>

      {/* 1. Termin und Kontakt */}
      <Abschnitt id="kontakt" titel="1. Termin und Kontakt">
        <dl className="angaben">
          <div>
            <dt>Kunde</dt>
            <dd>{beratung.name}</dd>
          </div>
          <div>
            <dt>Adresse</dt>
            <dd>{beratung.adresse}</dd>
          </div>
          <div>
            <dt>Telefon</dt>
            <dd>
              <a href={`tel:${beratung.telefon.replace(/[^+\d]/g, "")}`}>{beratung.telefon}</a>
            </dd>
          </div>
          <div>
            <dt>E-Mail</dt>
            <dd>
              <a href={`mailto:${beratung.email}`}>{beratung.email}</a>
            </dd>
          </div>
          {beratung.bemerkung && (
            <div>
              <dt>Bemerkung bei der Buchung</dt>
              <dd style={{ whiteSpace: "pre-line" }}>{beratung.bemerkung}</dd>
            </div>
          )}
        </dl>
        <div className="grid2">
          <Feld label="Ansprechperson vor Ort (falls jemand anderes)" wert={d.kontakt.ansprechperson} setzen={(v) => aendern((x) => void (x.kontakt.ansprechperson = v))} />
          <Feld label="Telefon Ansprechperson" typ="tel" wert={d.kontakt.ansprechTelefon} setzen={(v) => aendern((x) => void (x.kontakt.ansprechTelefon = v))} />
        </div>
        <Wahl label="Rolle" optionen={ROLLEN} wert={d.kontakt.rolle} setzen={(v) => aendern((x) => void (x.kontakt.rolle = v))} />
      </Abschnitt>

      {/* 2. Liegenschaft */}
      <Abschnitt id="liegenschaft" titel="2. Liegenschaft">
        <div className="grid2">
          <label className="field">
            Gebäudetyp
            <select value={d.liegenschaft.gebaeudetyp} onChange={(e) => aendern((x) => void (x.liegenschaft.gebaeudetyp = e.target.value))}>
              <option value="">Bitte wählen</option>
              {GEBAEUDETYPEN.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <Feld label="Anzahl Stockwerke" zahl wert={d.liegenschaft.stockwerke} setzen={(v) => aendern((x) => void (x.liegenschaft.stockwerke = v))} />
          <Feld label="Zugang Maschinenraum: wer hat den Schlüssel?" breit wert={d.liegenschaft.schluessel} setzen={(v) => aendern((x) => void (x.liegenschaft.schluessel = v))} />
        </div>
        <Wahl label="Attika" optionen={JA_NEIN} wert={d.liegenschaft.attika} setzen={(v) => aendern((x) => void (x.liegenschaft.attika = v))} />
      </Abschnitt>

      {/* 3. und 4. pro Aufzug: Anlagedaten, Zustand, Fotos */}
      {d.aufzuege.map((a, i) => {
        const fotos = d.fotos.filter((f) => f.aufzug === a.id);
        const set = (fn: (x: AufzugCheck) => void) => aufzugAendern(a.id, fn);
        return (
          <section className="card aufzug" key={a.id} id={`aufzug-${i + 1}`} aria-label={a.bezeichnung || `Aufzug ${i + 1}`}>
            <div className="row-between">
              <h2>{d.aufzuege.length > 1 ? a.bezeichnung || `Aufzug ${i + 1}` : "Aufzug"}</h2>
              {d.aufzuege.length > 1 &&
                (entfernen === a.id ? (
                  <span className="wahl">
                    <button type="button" className="btn btn--small btn--dark" onClick={() => aufzugEntfernen(a.id)}>
                      Wirklich entfernen
                    </button>
                    <button type="button" className="btn btn--small btn--outline" onClick={() => setEntfernen(null)}>
                      Abbrechen
                    </button>
                  </span>
                ) : (
                  <button type="button" className="linkbtn" onClick={() => setEntfernen(a.id)}>
                    Aufzug entfernen
                  </button>
                ))}
            </div>
            {d.aufzuege.length > 1 && (
              <Feld label="Bezeichnung, z. B. Haus A oder Lift links" wert={a.bezeichnung} setzen={(v) => set((x) => void (x.bezeichnung = v))} />
            )}

            <h3>3. Anlagedaten</h3>
            <div className="grid2" style={{ gridAutoFlow: "row dense" }}>
              <HerstellerWahl value={a.hersteller} onChange={(v) => set((x) => void (x.hersteller = v))} />
              <Feld label="Baujahr" zahl wert={a.baujahr} setzen={(v) => set((x) => void (x.baujahr = v))} />
              <Feld label="Fabrik- oder Anlagenummer (Typenschild)" wert={a.fabriknummer} setzen={(v) => set((x) => void (x.fabriknummer = v))} />
              <label className="field">
                Aufzugsart
                <select value={a.aufzugsart} onChange={(e) => set((x) => void (x.aufzugsart = e.target.value))}>
                  <option value="">Bitte wählen</option>
                  {AUFZUGSARTEN.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <Feld label="Traglast in kg" zahl wert={a.traglastKg} setzen={(v) => set((x) => void (x.traglastKg = v))} />
              <Feld label="Anzahl Personen" zahl wert={a.personen} setzen={(v) => set((x) => void (x.personen = v))} />
              <Feld label="Geschwindigkeit in m/s" zahl wert={a.geschwindigkeit} setzen={(v) => set((x) => void (x.geschwindigkeit = v))} />
              <Feld label="Anzahl Haltestellen *" zahl wert={a.haltestellen} setzen={(v) => set((x) => void (x.haltestellen = v))} />
              <Feld label="Anzahl Zugänge" zahl wert={a.zugaenge} setzen={(v) => set((x) => void (x.zugaenge = v))} />
            </div>
            <Wahl
              label="Antrieb *"
              optionen={[
                { value: "seil", label: "Seil" },
                { value: "hydraulik", label: "Hydraulik" },
                { value: "unbekannt", label: "Unbekannt" },
              ]}
              wert={a.antrieb}
              setzen={(v) => set((x) => void (x.antrieb = v))}
            />
            <Wahl
              label="Maschinenraum"
              optionen={[
                { value: "mit", label: "Mit Maschinenraum" },
                { value: "ohne", label: "Ohne Maschinenraum" },
              ]}
              wert={a.maschinenraum}
              setzen={(v) => set((x) => void (x.maschinenraum = v))}
            />
            <Wahl
              label="Türen"
              optionen={[
                { value: "schiebe", label: "Automatische Schiebetüren" },
                { value: "dreh", label: "Drehtüren von Hand" },
              ]}
              wert={a.tueren}
              setzen={(v) => set((x) => void (x.tueren = v))}
            />
            <Wahl label="Kabinenabschlusstüren" optionen={JA_NEIN} wert={a.kabinenabschlusstueren} setzen={(v) => set((x) => void (x.kabinenabschlusstueren = v))} />
            <Wahl label="Brandfallsteuerung" optionen={JA_NEIN_UNBEKANNT} wert={a.brandfall} setzen={(v) => set((x) => void (x.brandfall = v))} />
            <Wahl
              label="Sicherheitsdispositiv (Schutzeinrichtung bei zu kleinem Schachtkopf oder Grube)"
              optionen={JA_NEIN_UNBEKANNT}
              wert={a.sicherheitsdispositiv}
              setzen={(v) => set((x) => void (x.sicherheitsdispositiv = v))}
            />
            <Wahl label="Notruf: Telefon in der Kabine" optionen={JA_NEIN} wert={a.notruf} setzen={(v) => set((x) => void (x.notruf = v))} />
            {a.notruf === "ja" && (
              <Feld label="Notruf verbunden mit" platzhalter="z. B. Liftfirma oder Notrufzentrale" wert={a.notrufVerbunden} setzen={(v) => set((x) => void (x.notrufVerbunden = v))} />
            )}

            <h3>4. Zustand auf einen Blick</h3>
            <p className="muted">Einfache Sichtprüfung, kein technischer Prüfbericht.</p>
            <div className="zustand">
              {ZUSTAND_PUNKTE.map((p) => (
                <div className="zustand__punkt" key={p.key}>
                  <Wahl
                    label={`${p.label}: ${p.hinweis}`}
                    optionen={BEWERTUNGEN}
                    wert={a.zustand[p.key]}
                    setzen={(v) => set((x) => void (x.zustand[p.key] = v))}
                  />
                  <label className="field">
                    <span className="sr-only">Bemerkung {p.label}</span>
                    <input
                      value={a.zustandNotiz[p.key]}
                      maxLength={2000}
                      placeholder="Bemerkung (freiwillig)"
                      onChange={(e) => set((x) => void (x.zustandNotiz[p.key] = e.target.value))}
                    />
                  </label>
                </div>
              ))}
            </div>
            <Wahl
              label="Notruf getestet"
              optionen={[
                { value: "ja", label: "Funktioniert" },
                { value: "nein", label: "Funktioniert nicht" },
              ]}
              wert={a.notrufGetestet}
              setzen={(v) => set((x) => void (x.notrufGetestet = v))}
            />
            {a.antrieb === "hydraulik" && (
              <Wahl label="Ölverlust sichtbar" optionen={JA_NEIN} wert={a.oelverlust} setzen={(v) => set((x) => void (x.oelverlust = v))} />
            )}

            <h3>Fotos</h3>
            <p className="muted">
              {d.fotos.length} von {FOTOS_MAX} Fotos. Grosse Fotos werden automatisch verkleinert.
            </p>
            <div className="fotostellen">
              {FOTO_STELLEN.map((s) => {
                const hier = fotos.filter((f) => f.stelle === s.key);
                return (
                  <div className="fotostelle" key={s.key}>
                    <div className="row-between">
                      <span className="fotostelle__name">{s.label}</span>
                      {d.fotos.length < FOTOS_MAX && (
                        <label className="btn btn--small btn--outline datei-knopf">
                          {hier.length ? "Weiteres Foto" : "Foto"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            aria-label={`Foto ${s.label}`}
                            onChange={(e) => {
                              const liste = Array.from(e.target.files ?? []);
                              e.target.value = "";
                              void fotosHinzufuegen(a.id, s.key, liste);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {hier.length > 0 && (
                      <ul className="fotos">
                        {hier.map((f) => {
                          const src = lokal[f.id] ?? (aufServer.has(f.id) ? `/api/admin/beratung/${bid}/foto/${f.id}?klein=1` : null);
                          return (
                            <li key={f.id} className="foto">
                              {src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={src} alt={s.label} />
                              ) : (
                                <div className="foto__fehlt">Foto auf einem anderen Gerät</div>
                              )}
                              {!aufServer.has(f.id) && <span className="foto__wartet">wird hochgeladen</span>}
                              <input
                                aria-label={`Notiz zum Foto ${s.label}`}
                                placeholder="Notiz (freiwillig)"
                                maxLength={200}
                                value={f.notiz}
                                onChange={(e) =>
                                  aendern((x) => {
                                    const g = x.fotos.find((y) => y.id === f.id);
                                    if (g) g.notiz = e.target.value;
                                  })
                                }
                              />
                              <button type="button" className="linkbtn" onClick={() => fotoEntfernen(f.id)}>
                                Entfernen
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {fotoHinweis && <p className="error">{fotoHinweis}</p>}
          </section>
        );
      })}
      {d.aufzuege.length < AUFZUEGE_MAX && (
        <button type="button" className="btn btn--outline checkliste__plus" onClick={aufzugHinzufuegen}>
          Weiteren Aufzug hinzufügen
        </button>
      )}

      {/* 5. Heutige Wartung */}
      <Abschnitt id="wartung" titel="5. Heutige Wartung">
        <div className="grid2" style={{ gridAutoFlow: "row dense" }}>
          <HerstellerWahl label="Bisherige Wartungsfirma" value={d.wartung.firma} onChange={(v) => aendern((x) => void (x.wartung.firma = v))} />
          <Feld label="Jährliche Kosten in CHF" zahl wert={d.wartung.kostenChf} setzen={(v) => aendern((x) => void (x.wartung.kostenChf = v))} />
          <Feld label="Wartungen pro Jahr" zahl wert={d.wartung.wartungenProJahr} setzen={(v) => aendern((x) => void (x.wartung.wartungenProJahr = v))} />
          <Feld label="Vertragsbeginn" typ="date" wert={d.wartung.vertragsbeginn} setzen={(v) => aendern((x) => void (x.wartung.vertragsbeginn = v))} />
          <Feld label="Laufzeit" platzhalter="z. B. 5 Jahre" wert={d.wartung.laufzeit} setzen={(v) => aendern((x) => void (x.wartung.laufzeit = v))} />
          <Feld label="Kündigungsfrist" platzhalter="z. B. 6 Monate" wert={d.wartung.kuendigungsfrist} setzen={(v) => aendern((x) => void (x.wartung.kuendigungsfrist = v))} />
          <Feld label="Nächster möglicher Kündigungstermin" typ="date" wert={d.wartung.kuendigungstermin} setzen={(v) => aendern((x) => void (x.wartung.kuendigungstermin = v))} />
          <Feld label="Letzte Wartung" typ="date" wert={d.wartung.letzteWartung} setzen={(v) => aendern((x) => void (x.wartung.letzteWartung = v))} />
          <Feld label="Letzte periodische Kontrolle" typ="date" wert={d.wartung.letzteKontrolle} setzen={(v) => aendern((x) => void (x.wartung.letzteKontrolle = v))} />
          <Feld label="Störungen pro Jahr (ungefähr)" zahl wert={d.wartung.stoerungenProJahr} setzen={(v) => aendern((x) => void (x.wartung.stoerungenProJahr = v))} />
        </div>
        <Wahl label="Pikett 24 Stunden im Vertrag" optionen={JA_NEIN} wert={d.wartung.pikett24h} setzen={(v) => aendern((x) => void (x.wartung.pikett24h = v))} />
        <Text label="Offene Mängel aus der letzten Kontrolle" wert={d.wartung.offeneMaengel} setzen={(v) => aendern((x) => void (x.wartung.offeneMaengel = v))} />
        <Wahl
          label="Zufriedenheit des Kunden (1 = schlecht, 5 = sehr gut)"
          optionen={["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n }))}
          wert={d.wartung.zufriedenheit ? String(d.wartung.zufriedenheit) : ""}
          setzen={(v) => aendern((x) => void (x.wartung.zufriedenheit = v ? Number(v) : 0))}
        />
        <Feld label="Bemerkung zur Zufriedenheit" breit wert={d.wartung.zufriedenheitNotiz} setzen={(v) => aendern((x) => void (x.wartung.zufriedenheitNotiz = v))} />
        <p className="hint">Fotos vom Wartungsvertrag oder Kontrollbericht kannst du oben beim Aufzug unter „Weitere Fotos“ machen.</p>
      </Abschnitt>

      {/* 6. Wünsche */}
      <Abschnitt id="wuensche" titel="6. Wünsche des Kunden">
        <Wahl
          label="Gewünschtes Paket"
          optionen={[...PAKETE, { value: "offen", label: "Noch offen" }]}
          wert={d.wuensche.paket}
          setzen={(v) => aendern((x) => void (x.wuensche.paket = v))}
        />
        <Wahl label="Pikett 24 Stunden" optionen={WICHTIG} wert={d.wuensche.pikett} setzen={(v) => aendern((x) => void (x.wuensche.pikett = v))} />
        <Wahl label="Kurze Reaktionszeit" optionen={WICHTIG} wert={d.wuensche.reaktion} setzen={(v) => aendern((x) => void (x.wuensche.reaktion = v))} />
        <Wahl label="Tiefer Preis" optionen={WICHTIG} wert={d.wuensche.preis} setzen={(v) => aendern((x) => void (x.wuensche.preis = v))} />
        <Wahl
          label="Modernisierung oder Ersatz in den nächsten Jahren geplant"
          optionen={[...JA_NEIN, { value: "unklar", label: "Unklar" }]}
          wert={d.wuensche.modernisierung}
          setzen={(v) => aendern((x) => void (x.wuensche.modernisierung = v))}
        />
        <Text label="Weitere Wünsche" wert={d.wuensche.weitere} setzen={(v) => aendern((x) => void (x.wuensche.weitere = v))} />
      </Abschnitt>

      {/* 7. Abschluss */}
      <Abschnitt id="abschluss" titel="7. Abschluss und Empfehlung">
        <Wahl label="Deine Empfehlung" optionen={PAKETE} wert={d.abschluss.empfehlung} setzen={(v) => aendern((x) => void (x.abschluss.empfehlung = v))} />
        <Text label="Begründung" wert={d.abschluss.begruendung} setzen={(v) => aendern((x) => void (x.abschluss.begruendung = v))} />
        <fieldset className="group">
          <legend className="field">Nächste Schritte</legend>
          {(
            [
              ["vergleichen", "Angebote vergleichen"],
              ["kuendigen", "Bisherigen Wartungsvertrag kündigen"],
              ["kontrollbericht", "Letzten Kontrollbericht nachreichen"],
            ] as const
          ).map(([k, l]) => (
            <label className="check" key={k}>
              <input type="checkbox" checked={d.abschluss.schritte[k]} onChange={(e) => aendern((x) => void (x.abschluss.schritte[k] = e.target.checked))} />
              {l}
            </label>
          ))}
        </fieldset>
        <Wahl label="Bericht per E-Mail an den Kunden" optionen={JA_NEIN} wert={d.abschluss.berichtPerMail} setzen={(v) => aendern((x) => void (x.abschluss.berichtPerMail = v))} />
        {d.abschluss.berichtPerMail === "ja" && (
          <p className="hint">Den Versand per E-Mail gibt es mit der E-Mail-Funktion. Bis dahin lädst du den Bericht unten herunter und schickst ihn selbst.</p>
        )}
        <div className="field">
          <span>Unterschrift des Kunden (bestätigt die Beratung, freiwillig)</span>
          <Unterschrift wert={d.abschluss.unterschrift} setzen={(v) => aendern((x) => void (x.abschluss.unterschrift = v))} />
        </div>
        <Feld label="Name der unterschreibenden Person" wert={d.abschluss.unterschriftName} setzen={(v) => aendern((x) => void (x.abschluss.unterschriftName = v))} />

        <div className="abschluss">
          {abgeschlossen ? (
            <>
              <p className="success">
                <strong>Beratung abgeschlossen</strong> am{" "}
                {new Date(d.abschluss.abgeschlossenAm).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="btn-row btn-row--start">
                {alles ? (
                  <a className="btn btn--dark" href={berichtUrl} download>
                    Bericht herunterladen (PDF)
                  </a>
                ) : (
                  <span className="muted">Der Bericht ist bereit, sobald alles hochgeladen ist.</span>
                )}
                <button type="button" className="btn btn--outline" onClick={() => aendern((x) => void (x.abschluss.abgeschlossenAm = ""))}>
                  Wieder bearbeiten
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="btn-row btn-row--start">
                <button type="button" className="btn btn--dark" onClick={abschliessen}>
                  Beratung abschliessen
                </button>
                {alles && (
                  <a className="btn btn--outline" href={berichtUrl} download>
                    Vorschau Bericht (PDF)
                  </a>
                )}
              </div>
              {abschlussFehler.length > 0 && (
                <div className="error" role="alert">
                  Bitte noch ergänzen:
                  <ul>
                    {abschlussFehler.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </Abschnitt>

      <div className={`speicherstand speicherstand--${alles ? "ok" : status}`} role="status" aria-live="polite">
        {status === "anmelden" ? (
          <>
            Du bist nicht mehr angemeldet. Deine Eingaben bleiben auf diesem Gerät.{" "}
            <a href="/partner/login" target="_blank" rel="noopener">
              Neu anmelden
            </a>
          </>
        ) : status === "offline" ? (
          `Kein Empfang. Alles ist auf diesem Gerät gesichert und wird hochgeladen, sobald wieder Empfang da ist.${wartend ? ` ${wartend} Foto(s) warten.` : ""}`
        ) : status === "fehler" ? (
          `Speichern hat gerade nicht geklappt. Alles ist auf diesem Gerät gesichert, neuer Versuch läuft automatisch.${wartend ? ` ${wartend} Foto(s) warten.` : ""}`
        ) : status === "speichert" || !alles ? (
          `Wird gespeichert …${wartend ? ` ${wartend} Foto(s) werden hochgeladen.` : ""}`
        ) : (
          "Alles gespeichert"
        )}
      </div>
    </>
  );
}
