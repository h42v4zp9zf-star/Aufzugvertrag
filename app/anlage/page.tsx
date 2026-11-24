import type { Metadata } from "next";
import { fromParams } from "@/lib/anlageParams";
import { AnlageFormular } from "./AnlageFormular";

export const metadata: Metadata = { title: "Anlage erfassen" };

// Kommt der Kunde über „Angaben ändern“ aus dem Vergleich, stehen seine Angaben in der Adresse
// (Verbesserung Nr. 16): Das Formular startet dann mit diesen Werten statt leer.
export default async function AnlagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const roh = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(roh)) if (typeof v === "string") params.set(k, v);
  return <AnlageFormular start={fromParams(params)} />;
}
