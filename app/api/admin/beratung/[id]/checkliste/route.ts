// Checkliste vor Ort speichern. Das Handy schickt nach jeder Änderung den ganzen Stand.
import { checklisteBereinigen, pflichtFehler } from "@/lib/checkliste";
import { db } from "@/lib/db";
import { checklisteSpeichern, fotoIds } from "@/lib/repo";
import { antwort, verwaltungBeratung } from "@/lib/verwaltungApi";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_000_000;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await verwaltungBeratung(req, params);
  if ("fehler" in r) return r.fehler;

  const roh = await req.text();
  if (roh.length > MAX_BYTES) return antwort(413, "Die Checkliste ist zu gross.");
  let json: unknown;
  try {
    json = JSON.parse(roh);
  } catch {
    return antwort(400, "Ungültige Daten.");
  }
  const eingang = (json as { daten?: unknown } | null)?.daten;
  const wollteAbschliessen =
    typeof eingang === "object" && eingang !== null && !!(eingang as { abschluss?: { abgeschlossenAm?: unknown } }).abschluss?.abgeschlossenAm;

  const daten = checklisteBereinigen(eingang, r.beratung.anzahl_aufzuege);
  const d = await db();
  const geaendertAm = await checklisteSpeichern(d, r.beratung.id, daten);
  return Response.json(
    {
      geaendertAm,
      abgeschlossenAm: daten.abschluss.abgeschlossenAm,
      fehlt: wollteAbschliessen && !daten.abschluss.abgeschlossenAm ? pflichtFehler(daten) : [],
      fotos: await fotoIds(d, r.beratung.id),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
