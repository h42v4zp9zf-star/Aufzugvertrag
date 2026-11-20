// Anmeldung über ein zufälliges Token im Cookie; in der Datenbank liegt nur sein Hash.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { neuesToken, tokenHash } from "./passwort";
import { kontoPerSitzung, sitzungAnlegen, sitzungLoeschen, type Konto, type Rolle } from "./repo";

const COOKIE = "ml_sitzung";
const TAGE = 30;

export async function aktuellesKonto(): Promise<Konto | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const konto = await kontoPerSitzung(await db(), tokenHash(token));
  if (!konto || konto.status === "gesperrt") return null;
  return konto;
}

export async function kontoErforderlich(rolle: Rolle = "firma"): Promise<Konto> {
  const konto = await aktuellesKonto();
  if (!konto) redirect("/partner/login");
  if (rolle === "admin" && konto.rolle !== "admin") redirect("/partner");
  return konto;
}

// Nur in Server Actions aufrufen (setzt ein Cookie).
export async function sitzungStarten(kontoId: number): Promise<void> {
  const token = neuesToken();
  await sitzungAnlegen(await db(), tokenHash(token), kontoId, TAGE);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TAGE * 24 * 60 * 60,
  });
}

export async function sitzungBeenden(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sitzungLoeschen(await db(), tokenHash(token));
  jar.delete(COOKIE);
}
