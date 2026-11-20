"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPasswort, passwortFehler, pruefePasswort } from "@/lib/passwort";
import { leseFormular } from "@/lib/preismodellForm";
import { kontoAnlegen, kontoMitHashPerEmail, kontoStatusSetzen, preismodellSpeichern, type KontoStatus } from "@/lib/repo";
import { kontoErforderlich, sitzungBeenden, sitzungStarten } from "@/lib/sitzung";

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
  if (fehler.length) return { fehler, werte };

  const d = await db();
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
  const konto = await kontoMitHashPerEmail(await db(), email);
  const ok = konto ? await pruefePasswort(passwort, konto.passwort_hash) : false;
  if (!konto || !ok) return { fehler: ["E-Mail oder Passwort ist falsch."], werte: { email } };
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
  revalidatePath("/admin");
}
