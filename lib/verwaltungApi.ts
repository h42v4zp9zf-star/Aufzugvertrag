// Gemeinsame Prüfungen für die Schnittstellen der Verwaltung (Checkliste, Fotos, Bericht).
import { db, dbKonfiguriert } from "./db";
import { beratungLaden, type Beratung } from "./repo";
import { aktuellesKonto } from "./sitzung";

const antwort = (status: number, fehler: string) => Response.json({ fehler }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Prüft Anmeldung (nur Verwaltung), Herkunft (nur von der eigenen Seite) und lädt die Beratung.
 * Gibt entweder die Beratung oder eine fertige Fehlerantwort zurück.
 */
export async function verwaltungBeratung(
  req: Request,
  params: Promise<{ id: string }>,
): Promise<{ beratung: Beratung } | { fehler: Response }> {
  if (!dbKonfiguriert()) return { fehler: antwort(503, "Keine Datenbank eingerichtet.") };

  if (req.method !== "GET") {
    const herkunft = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (herkunft) {
      let ok = false;
      try {
        ok = new URL(herkunft).host === host;
      } catch {
        ok = false;
      }
      if (!ok) return { fehler: antwort(403, "Nicht erlaubt.") };
    }
  }

  const konto = await aktuellesKonto();
  if (!konto || konto.rolle !== "admin") return { fehler: antwort(401, "Bitte neu anmelden.") };

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return { fehler: antwort(404, "Beratung nicht gefunden.") };
  const beratung = await beratungLaden(await db(), id);
  if (!beratung) return { fehler: antwort(404, "Beratung nicht gefunden.") };
  return { beratung };
}

export { antwort };
