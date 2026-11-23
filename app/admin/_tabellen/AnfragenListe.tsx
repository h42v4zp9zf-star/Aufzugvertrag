"use client";

import { useMemo, useState } from "react";
import { AnfragenTabelle } from "@/components/AnfragenTabelle";
import { chf, VERMITTLUNGSGEBUEHR_CHF } from "@/lib/pricing";
import type { Anfrage } from "@/lib/repo";
import { Auswahl, FilterZeile, KeineTreffer, Suche, alphabetisch, passt, zeit } from "./Filter";

export function AnfragenListe({ anfragen }: { anfragen: Anfrage[] }) {
  const [suche, setSuche] = useState("");
  const [firma, setFirma] = useState("alle");
  const [paket, setPaket] = useState("alle");
  const [sortierung, setSortierung] = useState("neu");

  const firmen = useMemo(() => [...new Set(anfragen.map((a) => a.firma))].sort(alphabetisch), [anfragen]);
  const liste = useMemo(() => {
    const l = anfragen.filter(
      (a) =>
        (firma === "alle" || a.firma === firma) &&
        (paket === "alle" || a.stufe === paket) &&
        passt(suche, a.kunde_name, a.kunde_email, a.kunde_adresse, a.firma),
    );
    const sort: Record<string, (x: Anfrage, y: Anfrage) => number> = {
      neu: (x, y) => zeit(y.erstellt_am) - zeit(x.erstellt_am),
      alt: (x, y) => zeit(x.erstellt_am) - zeit(y.erstellt_am),
      kunde: (x, y) => alphabetisch(x.kunde_name, y.kunde_name),
      firma: (x, y) => alphabetisch(x.firma, y.firma) || zeit(y.erstellt_am) - zeit(x.erstellt_am),
      preis: (x, y) => y.preis_chf - x.preis_chf,
    };
    return l.sort(sort[sortierung] ?? sort.neu);
  }, [anfragen, suche, firma, paket, sortierung]);

  const zusammenfassung = (
    <span className="muted">
      {liste.length < anfragen.length ? `${liste.length} von ${anfragen.length}` : anfragen.length} Anfrage(n) · Vermittlungsgebühren{" "}
      {chf(liste.length * VERMITTLUNGSGEBUEHR_CHF)}
    </span>
  );

  return (
    <>
      <div className="row-between">
        <h2>Alle Anfragen</h2>
        {zusammenfassung}
      </div>
      {anfragen.length > 0 && (
        <FilterZeile>
          <Suche wert={suche} setzen={setSuche} platzhalter="Kunde, E-Mail, Adresse oder Liftfirma" />
          <Auswahl label="Liftfirma" wert={firma} setzen={setFirma} optionen={[["alle", "Alle"], ...firmen.map((f) => [f, f] as const)]} />
          <Auswahl
            label="Paket"
            wert={paket}
            setzen={setPaket}
            optionen={[
              ["alle", "Alle"],
              ["basis", "Basis"],
              ["standard", "Standard"],
              ["komplett", "Komplett"],
            ]}
          />
          <Auswahl
            label="Sortieren"
            wert={sortierung}
            setzen={setSortierung}
            optionen={[
              ["neu", "Neueste zuerst"],
              ["alt", "Älteste zuerst"],
              ["kunde", "Kunde A–Z"],
              ["firma", "Liftfirma A–Z"],
              ["preis", "Preis hoch bis tief"],
            ]}
          />
        </FilterZeile>
      )}
      {anfragen.length > 0 && liste.length === 0 ? <KeineTreffer /> : <AnfragenTabelle anfragen={liste} mitFirma />}
    </>
  );
}
