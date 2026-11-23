// Ein Foto zur Checkliste hochladen: gross (für später) und verkleinert (für Bericht und Vorschau).
// Das Handy verkleinert die Fotos selbst; hier wird nur geprüft, dass es wirklich JPG-Bilder sind.
import { db } from "@/lib/db";
import { fotoSpeichern } from "@/lib/repo";
import { antwort, verwaltungBeratung } from "@/lib/verwaltungApi";

export const dynamic = "force-dynamic";

const GROSS_MAX = 3 * 1024 * 1024;
const KLEIN_MAX = 800 * 1024;
const ID_MUSTER = /^[A-Za-z0-9_-]{1,64}$/;

async function jpg(f: FormDataEntryValue | null, max: number): Promise<Buffer | null> {
  if (!(f instanceof File) || f.size === 0 || f.size > max) return null;
  const b = Buffer.from(await f.arrayBuffer());
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? b : null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await verwaltungBeratung(req, params);
  if ("fehler" in r) return r.fehler;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return antwort(400, "Ungültige Daten.");
  }
  const fotoId = form.get("fotoId");
  if (typeof fotoId !== "string" || !ID_MUSTER.test(fotoId)) return antwort(400, "Ungültige Foto-Kennung.");
  const gross = await jpg(form.get("gross"), GROSS_MAX);
  const klein = await jpg(form.get("klein"), KLEIN_MAX);
  if (!gross || !klein) return antwort(400, "Das Foto ist kein JPG oder zu gross.");

  const ergebnis = await fotoSpeichern(await db(), r.beratung.id, fotoId, gross, klein);
  if (ergebnis === "voll") return antwort(409, "Es sind schon 30 Fotos gespeichert.");
  return Response.json({ ok: true, ergebnis }, { status: ergebnis === "gespeichert" ? 201 : 200 });
}
