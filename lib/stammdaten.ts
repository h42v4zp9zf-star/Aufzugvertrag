// Auswahllisten, die Kundenformular und Liftfirmen-Portal gemeinsam nutzen.

export const HERSTELLER = ["Schindler", "KONE", "TK Elevator", "Otis", "Emch", "AS Aufzüge", "Andere"];

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
