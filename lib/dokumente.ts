// Dokumente zur Beratung vor Ort (Wunsch Dario, 23.11.2026), z. B. bisheriger
// Wartungsvertrag oder Offerte: freiwillig, PDF, JPG oder PNG, bis 3 Dateien,
// zusammen höchstens 4 MB. Mehr nimmt Vercel in der Testversion pro Anfrage nicht an.
// Gespeichert werden sie in der Datenbank; herunterladen kann sie nur die Verwaltung.

export const DOKUMENTE_MAX_ANZAHL = 3;
export const DOKUMENTE_MAX_BYTES = 4 * 1024 * 1024;

export type DokumentTyp = "application/pdf" | "image/jpeg" | "image/png";

export const DOKUMENT_TYPEN: readonly DokumentTyp[] = ["application/pdf", "image/jpeg", "image/png"];

const ENDUNG: Record<DokumentTyp, RegExp> = {
  "application/pdf": /\.pdf$/i,
  "image/jpeg": /\.jpe?g$/i,
  "image/png": /\.png$/i,
};

const NEUE_ENDUNG: Record<DokumentTyp, string> = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };

/** Erkennt den Dateityp am Inhalt, nicht am Namen. Andere Dateien ergeben null. */
export function dokumentTyp(kopf: Uint8Array): DokumentTyp | null {
  const ist = (...bytes: number[]) => bytes.every((b, i) => kopf[i] === b);
  if (ist(0x25, 0x50, 0x44, 0x46)) return "application/pdf"; // %PDF
  if (ist(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (ist(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  return null;
}

/** Dateiname ohne Pfad und Steuerzeichen, gekürzt und mit passender Endung. */
export function sichererDateiname(roh: string, typ: DokumentTyp): string {
  let name = (roh.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .trim()
    .slice(0, 120);
  if (!name || name.startsWith(".")) name = `dokument${name}`;
  if (!ENDUNG[typ].test(name)) name += NEUE_ENDUNG[typ];
  return name;
}

/** z. B. „340 KB“ oder „1,2 MB“ */
export function groesseText(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
