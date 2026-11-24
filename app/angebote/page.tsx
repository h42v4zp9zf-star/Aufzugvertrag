import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { BEISPIELMODELLE } from "@/lib/beispielmodelle";
import { db, dbKonfiguriert } from "@/lib/db";
import type { Preismodell } from "@/lib/pricing";
import { aktivePreismodelle } from "@/lib/repo";
import { Angebote } from "./Angebote";

export const metadata: Metadata = { title: "Ihre Angebote" };
export const dynamic = "force-dynamic";

// Solange keine Liftfirma Preise veröffentlicht hat, zeigen wir Beispielpreise.
async function modelleLaden(): Promise<{ modelle: Preismodell[]; beispiel: boolean }> {
  if (!dbKonfiguriert()) return { modelle: BEISPIELMODELLE, beispiel: true };
  const modelle = await aktivePreismodelle(await db());
  return modelle.length > 0 ? { modelle, beispiel: false } : { modelle: BEISPIELMODELLE, beispiel: true };
}

export default async function AngebotePage() {
  const { modelle, beispiel } = await modelleLaden();
  return (
    <>
      <Header variant="bar" step="Schritt 2 von 2: Paket wählen" />
      <Suspense fallback={<main className="offers" />}>
        <Angebote modelle={modelle} beispiel={beispiel} />
      </Suspense>
    </>
  );
}
