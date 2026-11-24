import Link from "next/link";
import { ADRESSE, KONTAKT_EMAIL, MARKE, TELEFON } from "@/lib/config";

/** Für tel:-Links: nur Ziffern, mit Schweizer Vorwahl. */
export const telLink = (nummer: string) => `tel:+41${nummer.replace(/\D/g, "").replace(/^0/, "")}`;

export function Footer() {
  return (
    <footer className="footer">
      <span>{MARKE} © 2026</span>
      <span>
        {ADRESSE.strasse}, {ADRESSE.ort}
      </span>
      <a href={telLink(TELEFON)}>{TELEFON}</a>
      <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>
      <Link href="/impressum">Impressum</Link>
    </footer>
  );
}
