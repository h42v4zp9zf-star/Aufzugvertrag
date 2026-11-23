// Ein Foto der Checkliste anzeigen (nur Verwaltung). ?klein=1 liefert die verkleinerte Fassung.
import { db } from "@/lib/db";
import { fotoLaden } from "@/lib/repo";
import { antwort, verwaltungBeratung } from "@/lib/verwaltungApi";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; fotoId: string }> }) {
  const r = await verwaltungBeratung(req, params);
  if ("fehler" in r) return r.fehler;
  const { fotoId } = await params;
  const klein = new URL(req.url).searchParams.get("klein") === "1";
  const bild = await fotoLaden(await db(), r.beratung.id, fotoId, klein);
  if (!bild) return antwort(404, "Foto nicht gefunden.");
  return new Response(new Uint8Array(bild), {
    headers: {
      "Content-Type": "image/jpeg",
      // Ein Foto ändert sich nie (neue Fotos bekommen eine neue Kennung).
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
