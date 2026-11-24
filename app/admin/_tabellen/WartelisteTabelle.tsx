// Warteliste in der Verwaltung (Paket 2, Verbesserungen Nr. 8 und 23): Besucher, die benachrichtigt werden möchten.
import { WARTELISTE_GRUENDE, type WartelisteEintrag } from "@/lib/repo";

const datum = (d: Date) =>
  new Date(d).toLocaleDateString("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" });

export function WartelisteTabelle({ eintraege }: { eintraege: WartelisteEintrag[] }) {
  return (
    <>
      <div className="row-between">
        <h2>Warteliste</h2>
        <span className="muted">{eintraege.length === 1 ? "1 Eintrag" : `${eintraege.length} Einträge`}</span>
      </div>
      <p className="muted">
        Diese Besucher möchten eine E-Mail, sobald es für sie ein Angebot gibt: weil ihre PLZ ausserhalb des Kantons Zürich liegt oder noch
        keine Liftfirma für ihre Anlage ein Angebot hat.
      </p>
      {eintraege.length === 0 ? (
        <p className="muted">Noch keine Einträge.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>E-Mail</th>
                <th>PLZ</th>
                <th>Grund</th>
              </tr>
            </thead>
            <tbody>
              {eintraege.map((e) => (
                <tr key={e.id}>
                  <td>{datum(e.erstellt_am)}</td>
                  <td>
                    <a href={`mailto:${e.email}`} style={{ textDecoration: "underline" }}>
                      {e.email}
                    </a>
                  </td>
                  <td>{e.plz}</td>
                  <td>{WARTELISTE_GRUENDE[e.grund] ?? e.grund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
