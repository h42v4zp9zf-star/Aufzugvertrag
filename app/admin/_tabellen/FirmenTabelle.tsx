"use client";

import { useMemo, useState } from "react";
import { kontoStatusAendern } from "@/app/partner/actions";
import type { Konto, KontoStatus } from "@/lib/repo";
import { Auswahl, FilterZeile, KeineTreffer, Suche, alphabetisch, passt, zeit } from "./Filter";

const STATUS_TEXT: Record<KontoStatus, string> = { pruefung: "In Prüfung", aktiv: "Freigeschaltet", gesperrt: "Gesperrt" };

function StatusKnopf({ id, status, label, dunkel = false }: { id: number; status: KontoStatus; label: string; dunkel?: boolean }) {
  return (
    <form action={kontoStatusAendern} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`btn btn--small ${dunkel ? "btn--dark" : "btn--outline"}`}>
        {label}
      </button>
    </form>
  );
}

export function FirmenTabelle({ konten }: { konten: Konto[] }) {
  const [suche, setSuche] = useState("");
  const [status, setStatus] = useState("alle");
  const [sortierung, setSortierung] = useState("neu");

  const liste = useMemo(() => {
    const l = konten.filter((k) => (status === "alle" || k.status === status) && passt(suche, k.firma, k.uid, k.email));
    const sort: Record<string, (a: Konto, b: Konto) => number> = {
      neu: (a, b) => zeit(b.erstellt_am) - zeit(a.erstellt_am),
      alt: (a, b) => zeit(a.erstellt_am) - zeit(b.erstellt_am),
      az: (a, b) => alphabetisch(a.firma, b.firma),
      za: (a, b) => alphabetisch(b.firma, a.firma),
    };
    return l.sort(sort[sortierung] ?? sort.neu);
  }, [konten, suche, status, sortierung]);

  if (konten.length === 0) return <p className="muted">Noch keine Registrierungen.</p>;
  return (
    <>
      <FilterZeile>
        <Suche wert={suche} setzen={setSuche} platzhalter="Firma, UID oder E-Mail" />
        <Auswahl
          label="Status"
          wert={status}
          setzen={setStatus}
          optionen={[
            ["alle", "Alle"],
            ["pruefung", "In Prüfung"],
            ["aktiv", "Freigeschaltet"],
            ["gesperrt", "Gesperrt"],
          ]}
        />
        <Auswahl
          label="Sortieren"
          wert={sortierung}
          setzen={setSortierung}
          optionen={[
            ["neu", "Neueste zuerst"],
            ["alt", "Älteste zuerst"],
            ["az", "Firma A–Z"],
            ["za", "Firma Z–A"],
          ]}
        />
      </FilterZeile>
      {liste.length < konten.length && (
        <p className="muted">
          {liste.length} von {konten.length} Firmen
        </p>
      )}
      {liste.length === 0 ? (
        <KeineTreffer />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Firma</th>
                <th>UID</th>
                <th>E-Mail</th>
                <th>Status</th>
                <th className="right">
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {liste.map((k) => (
                <tr key={k.id}>
                  <td>{k.firma}</td>
                  <td>{k.uid}</td>
                  <td>{k.email}</td>
                  <td>
                    <span className={`pill${k.status === "aktiv" ? " pill--aktiv" : ""}`}>{STATUS_TEXT[k.status]}</span>
                  </td>
                  <td className="right" style={{ whiteSpace: "nowrap" }}>
                    {k.status !== "aktiv" && <StatusKnopf id={k.id} status="aktiv" label="Freischalten" dunkel />}{" "}
                    {k.status !== "gesperrt" && <StatusKnopf id={k.id} status="gesperrt" label="Sperren" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
