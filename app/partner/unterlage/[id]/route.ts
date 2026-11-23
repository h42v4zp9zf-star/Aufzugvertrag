// Herunterladen einer Vertragsunterlage. Nur für die Firma selbst und die Verwaltung.
import { db, dbKonfiguriert } from "@/lib/db";
import { unterlageLaden } from "@/lib/repo";
import { aktuellesKonto } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

const nichtGefunden = () => new Response("Nicht gefunden", { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbKonfiguriert()) return nichtGefunden();
  const konto = await aktuellesKonto();
  if (!konto) return new Response("Kein Zugriff", { status: 403 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return nichtGefunden();
  const dok = await unterlageLaden(await db(), id);
  // Fremde Unterlagen gelten als nicht vorhanden, damit niemand Nummern ausprobieren kann.
  if (!dok || (konto.rolle !== "admin" && dok.konto_id !== konto.id)) return nichtGefunden();

  const einfach = dok.dateiname.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(new Uint8Array(dok.inhalt), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${einfach}"; filename*=UTF-8''${encodeURIComponent(dok.dateiname)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
