import type { Metadata } from "next";
import { HAUPT_DOMAIN, MARKE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${HAUPT_DOMAIN}`),
  title: `${MARKE} – Aufzugswartung fair verglichen`,
  description:
    "Anlage erfassen, feste Angebote von Schweizer Liftfirmen vergleichen und den passenden Wartungsvertrag wählen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
