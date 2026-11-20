import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Angebote } from "./Angebote";

export default function AngebotePage() {
  return (
    <>
      <Header variant="bar" step="Schritt 2 von 2: Paket wählen" />
      <Suspense fallback={<main className="offers" />}>
        <Angebote />
      </Suspense>
    </>
  );
}
