import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "[NAME] – Aufzugswartung fair verglichen",
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
