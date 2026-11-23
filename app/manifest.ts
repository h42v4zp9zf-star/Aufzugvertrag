import type { MetadataRoute } from "next";
import { MARKE } from "@/lib/config";

// Damit die Seite auf dem Handy wie eine App auf dem Home-Bildschirm liegt
// (Name, Symbol, öffnet ohne Browser-Leiste).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${MARKE} – Aufzugswartung fair verglichen`,
    short_name: MARKE,
    description:
      "Anlage erfassen, feste Angebote von Schweizer Liftfirmen vergleichen und den passenden Wartungsvertrag wählen.",
    lang: "de-CH",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
