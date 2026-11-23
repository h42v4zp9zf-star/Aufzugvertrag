import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Dokumente zur Beratung: bis 4 MB Dateien plus Formularfelder (Standard wäre 1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
