import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Das Logo wird für die PDFs (Bericht und Benachrichtigungen per E-Mail) aus /public gelesen;
  // so liegt es auch bei Vercel bei der jeweiligen Funktion.
  outputFileTracingIncludes: {
    "/api/admin/beratung/[id]/bericht": ["./public/logo/elevaris-logo-v2.png"],
    "/beratung": ["./public/logo/elevaris-logo-v2.png"],
    "/angebote": ["./public/logo/elevaris-logo-v2.png"],
  },
  experimental: {
    // Dokumente zur Beratung: bis 4 MB Dateien plus Formularfelder (Standard wäre 1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
