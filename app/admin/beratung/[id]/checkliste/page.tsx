import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortalHeader } from "@/components/PortalHeader";
import { liegenschaftText } from "@/lib/adresse";
import { checklisteBereinigen, leereCheckliste } from "@/lib/checkliste";
import { db, dbKonfiguriert } from "@/lib/db";
import { beratungLaden, checklisteLaden, fotoIds } from "@/lib/repo";
import { kontoErforderlich } from "@/lib/sitzung";
import { terminText } from "@/lib/termine";
import { ChecklisteForm } from "./ChecklisteForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkliste Beratung vor Ort" };

export default async function ChecklistePage({ params }: { params: Promise<{ id: string }> }) {
  if (!dbKonfiguriert()) redirect("/partner/login");
  const konto = await kontoErforderlich("admin");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const d = await db();
  const b = await beratungLaden(d, id);
  if (!b) notFound();
  const stand = await checklisteLaden(d, id);
  const start = stand ? checklisteBereinigen(stand.daten, b.anzahl_aufzuege) : leereCheckliste(b.anzahl_aufzuege, b.name);

  return (
    <>
      <PortalHeader konto={konto} />
      <main className="portal checkliste">
        <ChecklisteForm
          beratung={{
            id: b.id,
            name: b.name,
            email: b.email,
            telefon: b.telefon,
            adresse: liegenschaftText(b),
            anzahlAufzuege: b.anzahl_aufzuege,
            termin: b.termin_datum && b.termin_zeit ? terminText(b.termin_datum, b.termin_zeit) : null,
            bemerkung: b.bemerkung,
          }}
          start={start}
          serverFotos={await fotoIds(d, id)}
        />
      </main>
    </>
  );
}
