import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Das Logo wird für den PDF-Bericht aus /public gelesen; so liegt es auch bei Vercel bei der Funktion.
  outputFileTracingIncludes: {
    "/api/admin/beratung/[id]/bericht": ["./public/logo/elevaris-logo-v2.png"],
  },
  experimental: {
    // Dokumente zur Beratung: bis 4 MB Dateien plus Formularfelder (Standard wäre 1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
