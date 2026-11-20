import Link from "next/link";
import { ADRESSE, KONTAKT_EMAIL, MARKE } from "@/lib/config";

export function Footer() {
  return (
    <footer className="footer">
      <span>{MARKE} © 2026</span>
      <span>
        {ADRESSE.strasse}, {ADRESSE.ort}
      </span>
      <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>
      <Link href="/impressum">Impressum</Link>
    </footer>
  );
}
