// Herunterladen eines Dokuments zur Beratung. Nur für die Verwaltung.
import { db, dbKonfiguriert } from "@/lib/db";
import { DOKUMENT_TYPEN } from "@/lib/dokumente";
import { dokumentLaden } from "@/lib/repo";
import { aktuellesKonto } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

const nichtGefunden = () => new Response("Nicht gefunden", { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbKonfiguriert()) return nichtGefunden();
  const konto = await aktuellesKonto();
  if (!konto || konto.rolle !== "admin") return new Response("Kein Zugriff", { status: 403 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return nichtGefunden();
  const dok = await dokumentLaden(await db(), id);
  if (!dok) return nichtGefunden();

  const typ = DOKUMENT_TYPEN.includes(dok.typ) ? dok.typ : "application/octet-stream";
  // Ersatzname nur mit einfachen Zeichen für ältere Programme, daneben der echte Name (UTF-8).
  const einfach = dok.dateiname.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(new Uint8Array(dok.inhalt), {
    headers: {
      "Content-Type": typ,
      "Content-Disposition": `attachment; filename="${einfach}"; filename*=UTF-8''${encodeURIComponent(dok.dateiname)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
