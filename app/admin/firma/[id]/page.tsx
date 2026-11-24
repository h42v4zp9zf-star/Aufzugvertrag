import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnfragenTabelle } from "@/components/AnfragenTabelle";
import { PortalHeader } from "@/components/PortalHeader";
import { db, dbKonfiguriert } from "@/lib/db";
import { groesseText } from "@/lib/dokumente";
import { chf, dauerText, fristText, PIKETT_TEXT, STUFEN, VERMITTLUNGSGEBUEHR_CHF, WARTUNGEN_PRO_STUFE, ZUSCHLAG_TEXT, type Antrieb, type Preismodell } from "@/lib/pricing";
import { anfragenListe, firmaLaden, preismodellLaden, unterlagenListe } from "@/lib/repo";
import { kontoErforderlich } from "@/lib/sitzung";
import { PLZ_KREISE, STUFEN_NAMEN } from "@/lib/stammdaten";
import { STATUS_TEXT, StatusKnopf } from "../../_tabellen/StatusKnopf";
import { PasswortLink } from "./PasswortLink";

// Detailseite einer Liftfirma in der Verwaltung (Wunsch Dario 23.11.2026):
// Firmendaten, Preisangaben so wie erfasst, Vertragsunterlagen und Anfragen.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Liftfirma ansehen" };

const ANTRIEB_TEXT: Record<Antrieb, string> = { seil: "Seilaufzüge", hydraulik: "Hydraulikaufzüge", unbekannt: "Unbekannt" };

const datum = (d: Date) => new Date(d).toLocaleDateString("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" });

function plzText(praefixe: string[]): string {
  if (praefixe.length === 0) return "Keine PLZ-Kreise gewählt";
  return [...praefixe]
    .sort()
    .map((k) => {
      const region = PLZ_KREISE.find((p) => p.kreis === k)?.region;
      return region ? `${k}xxx (${region})` : `${k}xxx`;
    })
    .join(", ");
}

export default async function FirmaPage({ params }: { params: Promise<{ id: string }> }) {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich("admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const d = await db();
  const firma = await firmaLaden(d, id);
  if (!firma) notFound();
  const [modell, unterlagen, anfragen] = await Promise.all([preismodellLaden(d, id), unterlagenListe(d, id), anfragenListe(d, id)]);
  const daten = modell?.daten;
  const zuschlaege = daten ? (Object.keys(ZUSCHLAG_TEXT) as (keyof Preismodell["zuschlaege"])[]) : [];

  return (
    <>
      <PortalHeader konto={konto} />
      <main className="portal">
        <div className="firma-kopf">
          <Link href="/admin?bereich=firmen" className="link-muted">
            ← Alle Liftfirmen
          </Link>
          <div className="firma-kopf__zeile">
            <div className="stack" style={{ gap: 8 }}>
              <h1>{firma.firma}</h1>
              <span>
                <span className={`pill${firma.status === "aktiv" ? " pill--aktiv" : ""}`}>{STATUS_TEXT[firma.status]}</span>
              </span>
            </div>
            <div className="firma-kopf__aktionen">
              {firma.status !== "aktiv" && <StatusKnopf id={firma.id} status="aktiv" label="Freischalten" dunkel />}
              {firma.status !== "gesperrt" && <StatusKnopf id={firma.id} status="gesperrt" label="Sperren" />}
            </div>
          </div>
        </div>

        <section className="card">
          <h2>Firmendaten</h2>
          <dl className="angaben">
            <div>
              <dt>Firma</dt>
              <dd>{firma.firma}</dd>
            </div>
            <div>
              <dt>UID</dt>
              <dd>{firma.uid || "–"}</dd>
            </div>
            <div>
              <dt>E-Mail</dt>
              <dd>
                <a href={`mailto:${firma.email}`}>{firma.email}</a>
              </dd>
            </div>
            <div>
              <dt>Registriert am</dt>
              <dd>{datum(firma.erstellt_am)}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2>Passwort zurücksetzen</h2>
          <PasswortLink id={firma.id} />
        </section>

        <section className="card">
          <div className="row-between">
            <h2>Preisangaben</h2>
            {modell && (
              <span className="muted">
                {modell.veroeffentlicht ? "Veröffentlicht" : "Nicht veröffentlicht"} · zuletzt geändert am {datum(modell.geaendert_am)}
              </span>
            )}
          </div>
          {!daten ? (
            <p className="muted">Diese Firma hat noch keine Preise erfasst.</p>
          ) : (
            <>
              <dl className="angaben">
                <div>
                  <dt>Einzugsgebiet</dt>
                  <dd>{plzText(daten.plzPraefixe)}</dd>
                </div>
                <div>
                  <dt>Antriebe</dt>
                  <dd>{daten.antriebe.length ? daten.antriebe.map((a) => ANTRIEB_TEXT[a]).join(", ") : "–"}</dd>
                </div>
                <div>
                  <dt>Hersteller</dt>
                  <dd>{daten.hersteller === "alle" ? "Alle Hersteller" : daten.hersteller.join(", ") || "–"}</dd>
                </div>
              </dl>

              <h3 className="untertitel">Pakete (Grundpreis pro Aufzug und Jahr, bis 4 Haltestellen)</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Paket</th>
                      <th>Wartungen pro Jahr</th>
                      <th className="right">Grundpreis</th>
                      <th>Reaktionszeit</th>
                      <th>Pikett-Deckung</th>
                      <th>Vertragsdauer</th>
                      <th>Kündigungsfrist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STUFEN.map((s) => {
                      const p = daten.pakete.find((x) => x.stufe === s);
                      return (
                        <tr key={s}>
                          <td>{STUFEN_NAMEN[s]}</td>
                          {p ? (
                            <>
                              <td>{WARTUNGEN_PRO_STUFE[s]}</td>
                              <td className="right nowrap">{chf(p.grundpreisChf)}</td>
                              <td className="nowrap">{p.reaktionszeitStd} Std.</td>
                              <td>{PIKETT_TEXT[p.pikett]}</td>
                              <td className="nowrap">{p.vertragsdauerJahre ? dauerText(p.vertragsdauerJahre) : <span className="muted">nicht angegeben</span>}</td>
                              <td className="nowrap">{p.kuendigungsfristMonate ? fristText(p.kuendigungsfristMonate) : <span className="muted">nicht angegeben</span>}</td>
                            </>
                          ) : (
                            <td colSpan={6} className="muted">
                              Nicht angeboten
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <h3 className="untertitel">Zuschläge (pro Aufzug und Jahr)</h3>
              <ul className="betraege">
                {zuschlaege.map((z) => (
                  <li key={z}>
                    <span>{ZUSCHLAG_TEXT[z]}</span>
                    <span className="betraege__chf">{chf(daten.zuschlaege[z] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card">
          <h2>Vertragsunterlagen</h2>
          {unterlagen.length === 0 ? (
            <p className="muted">Keine Unterlagen hochgeladen. Das Hochladen ist für die Liftfirmen freiwillig.</p>
          ) : (
            <ul className="unterlagen">
              {unterlagen.map((u) => (
                <li key={u.id}>
                  <a href={`/partner/unterlage/${u.id}`} className="unterlagen__name">
                    {u.dateiname}
                  </a>
                  <span className="muted">
                    {groesseText(u.groesse)} · hochgeladen am {datum(u.erstellt_am)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="row-between">
            <h2>Anfragen</h2>
            <span className="muted">
              {anfragen.length} Anfrage(n) · Vermittlungsgebühren {chf(anfragen.length * VERMITTLUNGSGEBUEHR_CHF)}
            </span>
          </div>
          <AnfragenTabelle anfragen={anfragen} />
        </section>
      </main>
    </>
  );
}
