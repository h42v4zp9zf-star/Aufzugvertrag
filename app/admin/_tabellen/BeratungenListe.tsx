"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BERATUNG_PREIS_CHF } from "@/lib/config";
import { groesseText } from "@/lib/dokumente";
import { chf } from "@/lib/pricing";
import type { Beratung } from "@/lib/repo";
import { terminText } from "@/lib/termine";
import { Auswahl, FilterZeile, KeineTreffer, Suche, alphabetisch, passt, zeit } from "./Filter";

const CHECKLISTE_TEXT = { angefangen: "Checkliste weiter ausfüllen", abgeschlossen: "Checkliste ansehen" } as const;

/** Sortierschlüssel „JJJJ-MM-TT HH:MM“; Buchungen ohne Termin (ältere) zählen als „noch abzumachen“. */
const terminSchluessel = (b: Beratung) => (b.termin_datum ? `${b.termin_datum} ${b.termin_zeit ?? ""}` : null);

export function BeratungenListe({ beratungen, heute }: { beratungen: Beratung[]; heute: string }) {
  const [suche, setSuche] = useState("");
  const [termine, setTermine] = useState("kommende");
  const [sortierung, setSortierung] = useState("naechster");

  const liste = useMemo(() => {
    const l = beratungen.filter((b) => {
      const kommend = !b.termin_datum || b.termin_datum >= heute;
      if (termine === "kommende" && !kommend) return false;
      if (termine === "vergangene" && kommend) return false;
      return passt(suche, b.name, b.email, b.telefon, b.adresse);
    });
    const ohne = "9999"; // ohne Termin ans Ende
    const sort: Record<string, (x: Beratung, y: Beratung) => number> = {
      naechster: (x, y) => (terminSchluessel(x) ?? ohne).localeCompare(terminSchluessel(y) ?? ohne),
      spaetester: (x, y) => (terminSchluessel(y) ?? "").localeCompare(terminSchluessel(x) ?? ""),
      gebucht: (x, y) => zeit(y.erstellt_am) - zeit(x.erstellt_am),
      kunde: (x, y) => alphabetisch(x.name, y.name),
    };
    return l.sort(sort[sortierung] ?? sort.naechster);
  }, [beratungen, suche, termine, sortierung, heute]);

  return (
    <>
      <div className="row-between">
        <h2>Beratungen vor Ort</h2>
        <span className="muted">
          {liste.length < beratungen.length ? `${liste.length} von ${beratungen.length}` : beratungen.length} Buchung(en) · Fixpreise{" "}
          {chf(liste.length * BERATUNG_PREIS_CHF)}
        </span>
      </div>
      {beratungen.length === 0 ? (
        <p className="muted">Noch keine Buchungen.</p>
      ) : (
        <>
          <FilterZeile>
            <Suche wert={suche} setzen={setSuche} platzhalter="Name, E-Mail, Telefon oder Adresse" />
            <Auswahl
              label="Termine"
              wert={termine}
              setzen={setTermine}
              optionen={[
                ["kommende", "Kommende"],
                ["vergangene", "Vergangene"],
                ["alle", "Alle"],
              ]}
            />
            <Auswahl
              label="Sortieren"
              wert={sortierung}
              setzen={setSortierung}
              optionen={[
                ["naechster", "Nächster Termin zuerst"],
                ["spaetester", "Spätester Termin zuerst"],
                ["gebucht", "Zuletzt gebucht zuerst"],
                ["kunde", "Kunde A–Z"],
              ]}
            />
          </FilterZeile>
          {liste.length === 0 ? (
            <KeineTreffer />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Termin</th>
                    <th>Kunde</th>
                    <th>Liegenschaft</th>
                    <th>Aufzüge</th>
                    <th>Bemerkung</th>
                    <th>Dokumente</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {b.termin_datum && b.termin_zeit ? terminText(b.termin_datum, b.termin_zeit) : "Noch abzumachen"}
                        <br />
                        <span className="muted">
                          gebucht am {new Date(b.erstellt_am).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                        <div className="checkliste-links">
                          <Link className="btn btn--small btn--outline" href={`/admin/beratung/${b.id}/checkliste`}>
                            {b.checkliste ? CHECKLISTE_TEXT[b.checkliste] : "Checkliste öffnen"}
                          </Link>
                          {b.checkliste === "abgeschlossen" && (
                            <a className="bericht-link" href={`/api/admin/beratung/${b.id}/bericht`} download>
                              Bericht (PDF)
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        {b.name}
                        <br />
                        <a href={`mailto:${b.email}`}>{b.email}</a>
                        <br />
                        {b.telefon}
                      </td>
                      <td>{b.adresse}</td>
                      <td>{b.anzahl_aufzuege}</td>
                      <td style={{ whiteSpace: "pre-line" }}>{b.bemerkung || "–"}</td>
                      <td>
                        {b.dokumente.length === 0
                          ? "–"
                          : b.dokumente.map((x) => (
                              <div key={x.id} className="dok-link">
                                <a href={`/admin/dokument/${x.id}`} download>
                                  {x.dateiname}
                                </a>{" "}
                                <span className="muted">{groesseText(x.groesse)}</span>
                              </div>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
