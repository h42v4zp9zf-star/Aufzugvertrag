import { chf, VERMITTLUNGSGEBUEHR_CHF } from "@/lib/pricing";
import type { Anfrage } from "@/lib/repo";
import { STUFEN_NAMEN } from "@/lib/stammdaten";

const datum = (d: Date) => new Date(d).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

export function AnfragenTabelle({ anfragen, mitFirma = false }: { anfragen: Anfrage[]; mitFirma?: boolean }) {
  if (anfragen.length === 0) return <p className="muted">Noch keine Anfragen.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            {mitFirma && <th>Liftfirma</th>}
            <th>Kunde</th>
            <th>Anlage</th>
            <th>Paket</th>
            <th>Preis pro Jahr</th>
            {mitFirma && <th>Gebühr</th>}
          </tr>
        </thead>
        <tbody>
          {anfragen.map((a) => (
            <tr key={a.id}>
              <td>{datum(a.erstellt_am)}</td>
              {mitFirma && <td>{a.firma}</td>}
              <td>
                {a.kunde_name}
                <br />
                <a href={`mailto:${a.kunde_email}`} style={{ textDecoration: "underline" }}>
                  {a.kunde_email}
                </a>
                {a.kunde_telefon && (
                  <>
                    <br />
                    {a.kunde_telefon}
                  </>
                )}
                {a.kunde_adresse && (
                  <>
                    <br />
                    <span className="muted">{a.kunde_adresse}</span>
                  </>
                )}
              </td>
              <td>
                {a.anlage.anzahlAufzuege} × {a.anlage.aufzugsart}, {a.anlage.haltestellen} Haltestellen
                <br />
                <span className="muted">
                  {a.anlage.hersteller === "unbekannt" ? "Hersteller unbekannt" : a.anlage.hersteller} · PLZ {a.anlage.plz}
                  {a.anlage.attika && ` · ${a.anlage.attika === "ja" ? "mit" : "ohne"} Attika`}
                  {a.anlage.sicherheitsdispositiv === "ja" && " · mit Sicherheitsdispositiv"}
                </span>
              </td>
              <td>{STUFEN_NAMEN[a.stufe]}</td>
              <td>{chf(a.preis_chf)}</td>
              {mitFirma && <td>{chf(VERMITTLUNGSGEBUEHR_CHF)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
