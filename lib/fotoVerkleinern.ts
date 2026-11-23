// Fotos im Browser verkleinern, bevor sie hochgeladen werden: eine grosse Fassung (max. 1600 px)
// und eine kleine für Bericht und Vorschau (max. 800 px). Immer als JPG.

async function bildLaden(datei: Blob): Promise<{ bild: CanvasImageSource; breite: number; hoehe: number; fertig: () => void }> {
  try {
    const b = await createImageBitmap(datei, { imageOrientation: "from-image" });
    return { bild: b, breite: b.width, hoehe: b.height, fertig: () => b.close() };
  } catch {
    const url = URL.createObjectURL(datei);
    const img = new Image();
    img.src = url;
    await img.decode();
    return { bild: img, breite: img.naturalWidth, hoehe: img.naturalHeight, fertig: () => URL.revokeObjectURL(url) };
  }
}

function zeichnen(q: { bild: CanvasImageSource; breite: number; hoehe: number }, maxPixel: number, qualitaet: number): Promise<Blob> {
  const faktor = Math.min(1, maxPixel / Math.max(q.breite, q.hoehe));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(q.breite * faktor));
  canvas.height = Math.max(1, Math.round(q.hoehe * faktor));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Kein Canvas"));
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(q.bild, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, fehler) => canvas.toBlob((b) => (b ? ok(b) : fehler(new Error("Bild leer"))), "image/jpeg", qualitaet));
}

export async function fotoVorbereiten(datei: Blob): Promise<{ gross: Blob; klein: Blob }> {
  const q = await bildLaden(datei);
  try {
    const gross = await zeichnen(q, 1600, 0.8);
    const klein = await zeichnen(q, 800, 0.72);
    return { gross, klein };
  } finally {
    q.fertig();
  }
}

export function neueId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
