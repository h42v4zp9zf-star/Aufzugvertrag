import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/PortalHeader";
import { db, dbKonfiguriert } from "@/lib/db";
import { preismodellLaden } from "@/lib/repo";
import { kontoErforderlich } from "@/lib/sitzung";
import { PreisFormular } from "./PreisFormular";

export const dynamic = "force-dynamic";

export default async function PreisePage() {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich();
  if (konto.rolle === "admin") redirect("/admin");
  const modell = await preismodellLaden(await db(), konto.id);
  return (
    <>
      <PortalHeader konto={konto} />
      <main className="portal">
        <div className="stack">
          <h1>Ihre Preise</h1>
          <p className="muted">
            Aus diesen Angaben berechnen wir für jede Kundenanlage einen festen Jahrespreis. Der Kunde sieht ihn als verbindliches Angebot.
          </p>
        </div>
        <PreisFormular gespeichert={modell?.daten ?? null} veroeffentlicht={modell?.veroeffentlicht ?? false} />
      </main>
    </>
  );
}
