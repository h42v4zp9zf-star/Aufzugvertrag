// Hilfen rund um die eigene Website: Adresse, unter der sie aufgerufen wurde, und das Logo.
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Adresse der Seite, so wie der Browser sie aufgerufen hat (Testversion oder später elevaris.ch).
 * `anfrageUrl` (falls bekannt) liefert Protokoll und Adresse, wenn die Kopfzeilen fehlen.
 */
export function seitenAdresse(h: Headers, anfrageUrl?: string): string {
  const url = anfrageUrl ? new URL(anfrageUrl) : null;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const lokal = !!host && /^(localhost|127\.)/.test(host);
  const proto = h.get("x-forwarded-proto") ?? url?.protocol.replace(":", "") ?? (lokal ? "http" : "https");
  return host ? `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}` : (url?.origin ?? "");
}

/** Logo als PNG für PDFs; null, wenn die Datei fehlt (dann steht der Markenname als Text). */
export async function logoLaden(): Promise<Uint8Array | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "logo", "elevaris-logo-v2.png"));
  } catch {
    return null;
  }
}
