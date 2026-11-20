// Passwörter werden mit scrypt (Node.js) gehasht, Sitzungs-Tokens nur als SHA-256 gespeichert.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

function scryptAsync(passwort: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(passwort, salt, KEYLEN, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPasswort(passwort: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passwort, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function pruefePasswort(passwort: string, gespeichert: string): Promise<boolean> {
  const [verfahren, saltHex, keyHex] = gespeichert.split("$");
  if (verfahren !== "scrypt" || !saltHex || !keyHex) return false;
  const erwartet = Buffer.from(keyHex, "hex");
  const key = await scryptAsync(passwort, Buffer.from(saltHex, "hex"));
  return key.length === erwartet.length && timingSafeEqual(key, erwartet);
}

export function neuesToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function passwortFehler(passwort: string): string | null {
  if (passwort.length < 10) return "Das Passwort muss mindestens 10 Zeichen lang sein.";
  return null;
}
