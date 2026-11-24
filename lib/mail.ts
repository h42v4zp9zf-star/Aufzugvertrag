// E-Mails über Resend (resend.com), Entscheide Dario 24.11.2026:
// - an Dario bei jeder Buchung und jeder angenommenen Offerte (BENACHRICHTIGUNG_AN),
// - an Liftfirmen bei „Passwort vergessen“.
// Ohne RESEND_API_KEY bleibt der Versand aus; Buchungen werden trotzdem gespeichert.

export const RESEND_URL = "https://api.resend.com/emails";
/** Absender im Testmodus von Resend; später z. B. „Elevaris <termine@elevaris.ch>“ über MAIL_ABSENDER. */
export const STANDARD_ABSENDER = "Elevaris <onboarding@resend.dev>";
const TIMEOUT_MS = 15_000;

export interface Anhang {
  dateiname: string;
  inhalt: Uint8Array;
}

export interface Mail {
  betreff: string;
  text: string;
  anhaenge: Anhang[];
}

export interface MailEinstellungen {
  apiKey: string;
  absender: string;
}

type Umgebung = Record<string, string | undefined>;

/** Zugang zu Resend aus den Umgebungsvariablen; null, solange RESEND_API_KEY fehlt. */
export function mailEinstellungen(env: Umgebung = process.env): MailEinstellungen | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, absender: env.MAIL_ABSENDER?.trim() || STANDARD_ABSENDER };
}

/** Empfänger der Benachrichtigungen (Dario); null, solange BENACHRICHTIGUNG_AN fehlt. */
export function benachrichtigungAn(env: Umgebung = process.env): string | null {
  return env.BENACHRICHTIGUNG_AN?.trim() || null;
}

export type Versand = { ok: true; id: string } | { ok: false; fehler: string };

export async function mailSenden(m: Mail, an: string, e: MailEinstellungen, holen: typeof fetch = fetch): Promise<Versand> {
  try {
    const antwort = await holen(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${e.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: e.absender,
        to: [an],
        subject: m.betreff,
        text: m.text,
        attachments: m.anhaenge.map((a) => ({ filename: a.dateiname, content: Buffer.from(a.inhalt).toString("base64") })),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const daten = (await antwort.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!antwort.ok) return { ok: false, fehler: `Resend ${antwort.status}: ${daten.message ?? antwort.statusText}` };
    return { ok: true, id: daten.id ?? "" };
  } catch (err) {
    return { ok: false, fehler: fehlerText(err) };
  }
}

/** Fehlermeldung samt Ursache (fetch meldet sonst nur „fetch failed“). */
function fehlerText(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const ursache = err.cause instanceof Error ? err.cause.message : typeof err.cause === "string" ? err.cause : "";
  return ursache && ursache !== err.message ? `${err.message} (${ursache})` : err.message;
}

/**
 * Baut die Mail und sendet sie an `an`. Wirft nie: Ein Fehler beim Versand darf eine Buchung
 * oder Anfrage nicht verhindern. Fehler stehen im Protokoll von Vercel (Logs).
 */
export async function versenden(
  art: string,
  an: string | null,
  bauen: () => Promise<Mail>,
  env: Umgebung = process.env,
  holen: typeof fetch = fetch,
): Promise<Versand | null> {
  const e = mailEinstellungen(env);
  if (!e || !an) {
    console.info(`[mail] ${art}: Versand nicht eingerichtet (RESEND_API_KEY oder Empfänger fehlt).`);
    return null;
  }
  let ergebnis: Versand;
  try {
    ergebnis = await mailSenden(await bauen(), an, e, holen);
  } catch (err) {
    ergebnis = { ok: false, fehler: fehlerText(err) };
  }
  if (ergebnis.ok) console.info(`[mail] ${art}: gesendet (${ergebnis.id}).`);
  else console.error(`[mail] ${art}: Versand fehlgeschlagen (die Eingabe ist trotzdem gespeichert). ${ergebnis.fehler}`);
  return ergebnis;
}

/** Benachrichtigung an Dario (BENACHRICHTIGUNG_AN). */
export function benachrichtigen(
  art: string,
  bauen: () => Promise<Mail>,
  env: Umgebung = process.env,
  holen: typeof fetch = fetch,
): Promise<Versand | null> {
  return versenden(art, benachrichtigungAn(env), bauen, env, holen);
}
