import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/Footer";
import { HAUPT_DOMAIN, MARKE } from "@/lib/config";
import "./globals.css";

// Schrift Inter mitliefern (Verbesserung Nr. 29, 24.11.2026): Die meisten Geräte haben sie nicht installiert
// und zeigten sonst eine Ersatzschrift. Datei aus @fontsource-variable/inter 5.3.0, alle Stärken in einer Datei,
// Lizenz: SIL Open Font License (fonts/OFL-Inter.txt). Liegt auf unserem Server, keine Anfrage an Google.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});

/** Adresse für die Vorschau beim Teilen (og:image): auf Vercel die Adresse der Testversion, sonst die Hauptdomain. */
function seitenBasis(): URL {
  const vercel =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);
  return new URL(vercel ? `https://${vercel}` : `https://${HAUPT_DOMAIN}`);
}

const TITEL = `${MARKE} – Aufzugswartung fair verglichen`;
const BESCHREIBUNG =
  "Anlage erfassen, feste Angebote von Schweizer Liftfirmen vergleichen und den passenden Wartungsvertrag wählen.";

export const metadata: Metadata = {
  metadataBase: seitenBasis(),
  // Bis zum offiziellen Start nicht in Suchmaschinen aufnehmen (Testversion).
  robots: { index: false, follow: false },
  // Jede Seite setzt nur ihren eigenen Namen, z. B. „Ihre Anlage“ → „Ihre Anlage – Elevaris“.
  title: { default: TITEL, template: `%s – ${MARKE}` },
  description: BESCHREIBUNG,
  applicationName: MARKE,
  // Vorschau beim Teilen (WhatsApp, LinkedIn, Mail); das Bild ist app/opengraph-image.png.
  openGraph: { type: "website", locale: "de_CH", siteName: MARKE, title: TITEL, description: BESCHREIBUNG },
  twitter: { card: "summary_large_image", title: TITEL, description: BESCHREIBUNG },
  // iPhone: Name und Verhalten, wenn die Seite auf dem Home-Bildschirm liegt.
  appleWebApp: { title: MARKE, capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH" className={inter.variable}>
      <body>
        {children}
        {/* Fusszeile auf allen Seiten (Verbesserung Nr. 31). */}
        <Footer />
      </body>
    </html>
  );
}
