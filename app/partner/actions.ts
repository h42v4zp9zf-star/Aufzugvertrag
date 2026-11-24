"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DOKUMENTE_MAX_BYTES, dokumentTyp, sichererDateiname } from "@/lib/dokumente";
import { hashPasswort, passwortFehler, pruefePasswort } from "@/lib/passwort";
import { leseFormular } from "@/lib/preismodellForm";
import {
  kontoAnlegen,
  kontoMitHashPerEmail,
  kontoStatusSetzen,
  preismodellSpeichern,
  UNTERLAGEN_MAX,
  unterlageLoeschen,
  unterlageSpeichern,
  type KontoStatus,
} from "@/lib/repo";
import { ipSchluessel, MELDUNG_LOGIN_GESPERRT, MELDUNG_ZU_VIELE, schluessel, versuchMerken, versucheLoeschen, zuViele } from "@/lib/schutz";
import { kontoErforderlich, sitzungBeenden, sitzungStarten } from "@/lib/sitzung";
import { istSpam, MELDUNG_SPAM, SPAM_FELD } from "@/lib/spamfalle";

export interface FormStatus {
  fehler: string[];
  gespeichert?: boolean;
  // Eingaben, die nach einem Fehler wieder im Formular stehen sollen (nie das Passwort).
  werte?: Record<string, string>;
}

const text = (f: FormData, n: string) => String(f.get(n) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registrieren(_: FormStatus, f: FormData): Promise<FormStatus> {
  const firma = text(f, "firma");
  const uid = text(f, "uid");
  const email = text(f, "email");
  const passwort = String(f.get("passwort") ?? "");
  const fehler: string[] = [];
  if (!firma) fehler.push("Bitte den Firmennamen angeben.");
  if (!/^CHE-?\d{3}\.?\d{3}\.?\d{3}$/i.test(uid)) fehler.push("Bitte eine gültige UID angeben (z. B. CHE-123.456.789).");
  if (!EMAIL.test(email)) fehler.push("Bitte eine gültige E-Mail-Adresse angeben.");
  const pf = passwortFehler(passwort);
  if (pf) fehler.push(pf);
  const werte = { firma, uid, email };
  if (istSpam(f.get(SPAM_FELD))) return { fehler: [MELDUNG_SPAM], werte };
  if (fehler.length) return { fehler, werte };

  // Höchstens 5 Registrierungen pro Stunde vom selben Anschluss (Verbesserung Nr. 32).
  const d = await db();
  const ip = ipSchluessel(await headers());
  if (await zuViele(d, "registrierung", ip)) return { fehler: [MELDUNG_ZU_VIELE], werte };
  await versuchMerken(d, "registrierung", ip);
  if (await kontoMitHashPerEmail(d, email)) {
    return { fehler: ["Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte melden Sie sich an."], werte };
  }
  const konto = await kontoAnlegen(d, { firma, uid: uid.toUpperCase(), email, passwortHash: await hashPasswort(passwort) });
  await sitzungStarten(konto.id);
  redirect("/partner");
}

export async function einloggen(_: FormStatus, f: FormData): Promise<FormStatus> {
  const email = text(f, "email");
  const passwort = String(f.get("passwort") ?? "");
  // Passwort-Raten bremsen (Verbesserung Nr. 32): nach 10 falschen Versuchen für eine E-Mail-Adresse
  // oder 30 vom selben Anschluss ist die Anmeldung 15 Minuten gesperrt.
  const d = await db();
  const adresse = schluessel(email);
  const ip = ipSchluessel(await headers());
  if ((await zuViele(d, "login-email", adresse)) || (await zuViele(d, "login-ip", ip))) {
    return { fehler: [MELDUNG_LOGIN_GESPERRT], werte: { email } };
  }
  const konto = await kontoMitHashPerEmail(d, email);
  const ok = konto ? await pruefePasswort(passwort, konto.passwort_hash) : false;
  if (!konto || !ok) {
    await versuchMerken(d, "login-email", adresse);
    await versuchMerken(d, "login-ip", ip);
    return { fehler: ["E-Mail oder Passwort ist falsch."], werte: { email } };
  }
  await versucheLoeschen(d, "login-email", adresse);
  if (konto.status === "gesperrt") return { fehler: ["Dieses Konto ist gesperrt. Bitte kontaktieren Sie uns."], werte: { email } };
  await sitzungStarten(konto.id);
  redirect(konto.rolle === "admin" ? "/admin" : "/partner");
}

export async function abmelden(): Promise<void> {
  await sitzungBeenden();
  redirect("/partner/login");
}

export async function preiseSpeichern(_: FormStatus, f: FormData): Promise<FormStatus> {
  const konto = await kontoErforderlich();
  const { daten, veroeffentlicht, fehler } = leseFormular(f);
  if (!daten) return { fehler };
  await preismodellSpeichern(await db(), konto.id, daten, veroeffentlicht);
  revalidatePath("/partner");
  return { fehler: [], gespeichert: true };
}

export async function kontoStatusAendern(f: FormData): Promise<void> {
  await kontoErforderlich("admin");
  const id = Number(f.get("id"));
  const status = String(f.get("status")) as KontoStatus;
  if (!Number.isInteger(id) || !["pruefung", "aktiv", "gesperrt"].includes(status)) return;
  await kontoStatusSetzen(await db(), id, status);
  revalidatePath("/admin", "layout");
}

// Vertragsunterlagen (Wunsch Dario 23.11.2026): freiwillig, nur PDF, bis 4 MB, höchstens 3.
export async function unterlageHochladen(_: FormStatus, f: FormData): Promise<FormStatus> {
  const konto = await kontoErforderlich();
  if (konto.rolle !== "firma") return { fehler: ["Nur Liftfirmen können Unterlagen hochladen."] };
  const datei = f.get("unterlage");
  if (!datei || typeof datei === "string" || datei.size === 0) return { fehler: ["Bitte eine PDF-Datei auswählen."] };
  if (datei.size > DOKUMENTE_MAX_BYTES) return { fehler: ["Die Datei ist zu gross. Bitte höchstens 4 MB."] };
  const inhalt = Buffer.from(await datei.arrayBuffer());
  if (dokumentTyp(inhalt) !== "application/pdf") return { fehler: ["Bitte nur PDF-Dateien hochladen."] };
  const ergebnis = await unterlageSpeichern(await db(), konto.id, sichererDateiname(datei.name, "application/pdf"), inhalt);
  if (ergebnis === "voll") return { fehler: [`Sie können höchstens ${UNTERLAGEN_MAX} Unterlagen hochladen. Bitte zuerst eine löschen.`] };
  revalidatePath("/partner");
  return { fehler: [], gespeichert: true };
}

export async function unterlageEntfernen(f: FormData): Promise<void> {
  const konto = await kontoErforderlich();
  const id = Number(f.get("id"));
  if (!Number.isInteger(id) || id < 1) return;
  await unterlageLoeschen(await db(), konto.id, id);
  revalidatePath("/partner");
}
