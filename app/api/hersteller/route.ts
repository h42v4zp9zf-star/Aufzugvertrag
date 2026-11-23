// Registrierte Liftfirmen für die Hersteller-Suchliste im Formular „Ihre Anlage“.
import { db, dbKonfiguriert } from "@/lib/db";
import { firmenNamen } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  let firmen: string[] = [];
  if (dbKonfiguriert()) {
    try {
      firmen = await firmenNamen(await db());
    } catch (e) {
      // Ohne Datenbank bleibt die feste Liste; das Formular funktioniert trotzdem.
      console.error("Firmennamen konnten nicht geladen werden", e);
    }
  }
  return Response.json({ firmen }, { headers: { "Cache-Control": "public, max-age=60" } });
}
