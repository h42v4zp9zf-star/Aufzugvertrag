// Bericht zur Beratung vor Ort als PDF herunterladen (nur Verwaltung).
import { liegenschaftText } from "@/lib/adresse";
import { berichtErstellen } from "@/lib/bericht";
import { anlageAusCheckliste, checklisteBereinigen, leereCheckliste } from "@/lib/checkliste";
import { KONTAKT_EMAIL, MARKE, VERANTWORTLICH } from "@/lib/config";
import { db } from "@/lib/db";
import { toParams } from "@/lib/anlageParams";
import { checklisteLaden, vorschauBilder } from "@/lib/repo";
import { logoLaden, seitenAdresse } from "@/lib/seite";
import { terminText } from "@/lib/termine";
import { verwaltungBeratung } from "@/lib/verwaltungApi";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await verwaltungBeratung(req, params);
  if ("fehler" in r) return r.fehler;
  const b = r.beratung;
  const d = await db();
  const stand = await checklisteLaden(d, b.id);
  const daten = stand ? checklisteBereinigen(stand.daten, b.anzahl_aufzuege) : leereCheckliste(b.anzahl_aufzuege, b.name);

  const anlage = anlageAusCheckliste(daten, b.adresse);
  const angeboteUrl = anlage ? `${seitenAdresse(req.headers, req.url)}/angebote?${toParams(anlage).toString()}` : null;

  const pdf = await berichtErstellen({
    marke: MARKE,
    kontaktEmail: KONTAKT_EMAIL,
    berater: VERANTWORTLICH,
    kunde: { name: b.name, email: b.email, telefon: b.telefon, adresse: liegenschaftText(b) },
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
