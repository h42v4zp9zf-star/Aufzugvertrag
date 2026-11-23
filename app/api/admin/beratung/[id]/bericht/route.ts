// Bericht zur Beratung vor Ort als PDF herunterladen (nur Verwaltung).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { berichtErstellen } from "@/lib/bericht";
import { anlageAusCheckliste, checklisteBereinigen, leereCheckliste } from "@/lib/checkliste";
import { KONTAKT_EMAIL, MARKE, VERANTWORTLICH } from "@/lib/config";
import { db } from "@/lib/db";
import { toParams } from "@/lib/anlageParams";
import { checklisteLaden, vorschauBilder } from "@/lib/repo";
import { terminText } from "@/lib/termine";
import { verwaltungBeratung } from "@/lib/verwaltungApi";

export const dynamic = "force-dynamic";

async function logoLaden(): Promise<Uint8Array | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "logo", "elevaris-logo-v2.png"));
  } catch {
    return null; // dann steht der Markenname als Text im Bericht
  }
}

/** Adresse der Seite, so wie der Browser sie aufgerufen hat (Testversion oder später elevaris.ch). */
function seitenAdresse(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return host ? `${proto.split(",")[0]}://${host.split(",")[0]}` : new URL(req.url).origin;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await verwaltungBeratung(req, params);
  if ("fehler" in r) return r.fehler;
  const b = r.beratung;
  const d = await db();
  const stand = await checklisteLaden(d, b.id);
  const daten = stand ? checklisteBereinigen(stand.daten, b.anzahl_aufzuege) : leereCheckliste(b.anzahl_aufzuege, b.name);

  const anlage = anlageAusCheckliste(daten, b.adresse);
  const angeboteUrl = anlage ? `${seitenAdresse(req)}/angebote?${toParams(anlage).toString()}` : null;

  const pdf = await berichtErstellen({
    marke: MARKE,
    kontaktEmail: KONTAKT_EMAIL,
    berater: VERANTWORTLICH,
    kunde: { name: b.name, email: b.email, telefon: b.telefon, adresse: b.adresse },
    termin: b.termin_datum && b.termin_zeit ? terminText(b.termin_datum, b.termin_zeit) : null,
    daten,
    bilder: await vorschauBilder(d, b.id),
    logo: await logoLaden(),
    angeboteUrl,
  });

  const tag = b.termin_datum ?? new Date().toISOString().slice(0, 10);
  const name = `Bericht Beratung ${b.name} ${tag}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
  const einfach = name.replace(/[^\x20-\x7e]/g, "_");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${einfach}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
