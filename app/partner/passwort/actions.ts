"use server";

// „Passwort vergessen“ (Entscheid Dario 24.11.2026): Link per E-Mail an die Liftfirma, dazu
// ein Knopf in der Verwaltung, solange Resend nur an Dario selbst senden darf.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { passwortMail } from "@/lib/benachrichtigung";
import { MARKE } from "@/lib/config";
import { db, dbKonfiguriert } from "@/lib/db";
import { versenden } from "@/lib/mail";
import {
  hashPasswort,
  neuesToken,
  PASSWORT_LINK_EMAIL_MIN,
  PASSWORT_LINK_SPERRE_MIN,
  PASSWORT_LINK_VERWALTUNG_MIN,
  passwortFehler,
  tokenHash,
} from "@/lib/passwort";
import { firmaLaden, kontoMitHashPerEmail, passwortLinkAnlegen, passwortLinkKuerzlich, passwortZuruecksetzen } from "@/lib/repo";
import { seitenAdresse } from "@/lib/seite";
import { kontoErforderlich } from "@/lib/sitzung";

export interface PasswortStatus {
  fehler: string[];
  gesendet?: boolean;
  abgelaufen?: boolean;
  email?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function linkAdresse(token: string): Promise<string> {
  return `${seitenAdresse(await headers())}/partner/passwort/neu?t=${encodeURIComponent(token)}`;
}

export async function passwortVergessen(_: PasswortStatus, f: FormData): Promise<PasswortStatus> {
  if (!dbKonfiguriert()) return { fehler: ["Das Portal ist noch nicht eingerichtet."] };
  const email = String(f.get("email") ?? "").trim();
  if (!EMAIL.test(email)) return { fehler: ["Bitte eine gültige E-Mail-Adresse angeben."], email };
  const d = await db();
  const konto = await kontoMitHashPerEmail(d, email);
  // Immer dieselbe Antwort, damit niemand herausfinden kann, welche Firmen registriert sind.
  if (konto && konto.status !== "gesperrt" && !(await passwortLinkKuerzlich(d, konto.id, PASSWORT_LINK_SPERRE_MIN))) {
    const token = neuesToken();
    await passwortLinkAnlegen(d, konto.id, tokenHash(token), PASSWORT_LINK_EMAIL_MIN);
    const url = await linkAdresse(token);
    after(() => versenden("Passwort vergessen", konto.email, async () => passwortMail({ marke: MARKE, firma: konto.firma, url, gueltig: "1 Stunde" })));
  }
  return { fehler: [], gesendet: true };
}

export async function neuesPasswortSetzen(_: PasswortStatus, f: FormData): Promise<PasswortStatus> {
  const token = String(f.get("t") ?? "");
  const passwort = String(f.get("passwort") ?? "");
  const wiederholung = String(f.get("passwort2") ?? "");
  const pf = passwortFehler(passwort);
  if (pf) return { fehler: [pf] };
  if (passwort !== wiederholung) return { fehler: ["Die beiden Passwörter stimmen nicht überein."] };
  const konto = token ? await passwortZuruecksetzen(await db(), tokenHash(token), await hashPasswort(passwort)) : null;
  if (!konto) return { fehler: ["Dieser Link ist abgelaufen oder wurde schon benutzt. Bitte fordern Sie einen neuen an."], abgelaufen: true };
  redirect("/partner/login?passwort=neu");
}

export interface LinkStatus {
  url?: string;
  fehler?: string;
}

/** Verwaltung: Link erstellen, den Dario der Firma selbst schickt (gilt 24 Stunden). */
export async function passwortLinkErstellen(_: LinkStatus, f: FormData): Promise<LinkStatus> {
  await kontoErforderlich("admin");
  const d = await db();
  const firma = await firmaLaden(d, Number(f.get("id")));
  if (!firma) return { fehler: "Diese Liftfirma gibt es nicht mehr." };
  const token = neuesToken();
  await passwortLinkAnlegen(d, firma.id, tokenHash(token), PASSWORT_LINK_VERWALTUNG_MIN);
  return { url: await linkAdresse(token) };
}
