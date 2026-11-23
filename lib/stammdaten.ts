// Auswahllisten, die Kundenformular und Liftfirmen-Portal gemeinsam nutzen.

/** Die 6 grossen Hersteller mit den meisten Anlagen in der Schweiz (direkt wählbar). */
export const HERSTELLER_HAUPT = ["Schindler", "KONE", "TK Elevator", "Otis", "Emch", "AS Aufzüge"];

/** Auswahl im Liftfirmen-Portal: die 6 grossen, alle übrigen zählen als „Andere“. */
export const HERSTELLER = [...HERSTELLER_HAUPT, "Andere"];

/** Weitere Hersteller aus Darios Liste (23.11.2026), im Kundenformular über „Andere“ mit Suchfeld. */
export const HERSTELLER_WEITERE = [
  "B-Lift & Technik",
  "Diethelm",
  "Garaventa",
  "Haslimann",
  "Hebetec",
  "Högg",
  "Lerch",
  "Lift AG",
  "Lifttech",
  "Lödige",
  "Lüthi",
  "Rigert (Treppenlifte)",
  "SIGA",
  "Stannah",
  "Walder",
];

/** Für den Abgleich mit den Liftfirmen: alles ausser „unbekannt“ und den 6 grossen gilt als „Andere“. */
export function herstellerGruppe(hersteller: string): string {
  return hersteller === "unbekannt" || HERSTELLER_HAUPT.includes(hersteller) ? hersteller : "Andere";
}

/** Für die Suche: Kleinbuchstaben, ohne Akzente (z. B. findet „hogg“ auch „Högg“). */
export function suchtext(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Kern eines Firmennamens ohne Rechtsform und allgemeine Wörter, z. B. „Schindler Aufzüge AG“ → „schindler“. */
function namensKern(name: string): string {
  const ohne = suchtext(name)
    .replace(/[()]/g, " ")
    .replace(/\b(ag|gmbh|sa|sarl|aufzuge|aufzug|lifte?|liftsysteme|elevator|schweiz|switzerland|suisse)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ohne || suchtext(name);
}

/** Gehört der Name zu einer Firma, die schon in der Liste steht? */
export function schonGelistet(name: string, liste: readonly string[]): boolean {
  const kern = namensKern(name);
  return liste.some((h) => {
    const k = namensKern(h);
    return kern === k || kern.startsWith(k + " ");
  });
}

/** Suchliste: alle Hersteller alphabetisch, dazu weitere Namen (ohne Doppelte). */
export function herstellerSuchliste(zusaetzlich: readonly string[] = []): string[] {
  const liste = [...HERSTELLER_HAUPT, ...HERSTELLER_WEITERE];
  for (const name of zusaetzlich) {
    const n = name.trim();
    if (n && !schonGelistet(n, liste)) liste.push(n);
  }
  return liste.sort((a, b) => a.localeCompare(b, "de-CH", { sensitivity: "base" }));
}

// Grobe Zuordnung der Schweizer PLZ-Kreise (erste Ziffer der Postleitzahl).
export const PLZ_KREISE: { kreis: string; region: string }[] = [
  { kreis: "1", region: "Westschweiz" },
  { kreis: "2", region: "Neuenburg, Jura, Biel" },
  { kreis: "3", region: "Bern, Oberwallis" },
  { kreis: "4", region: "Basel, Solothurn" },
  { kreis: "5", region: "Aargau" },
  { kreis: "6", region: "Zentralschweiz, Tessin" },
  { kreis: "7", region: "Graubünden" },
  { kreis: "8", region: "Zürich, Ostschweiz" },
  { kreis: "9", region: "St. Gallen, Appenzell" },
];

export const STUFEN_NAMEN = { basis: "Basis", standard: "Standard", komplett: "Komplett" } as const;
