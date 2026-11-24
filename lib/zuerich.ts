// Kanton Zürich: Postleitzahlen und Bezirke (Paket 2, Verbesserung Nr. 23, Entscheid Dario 24.11.2026:
// zum Start nur im Kanton Zürich). Liftfirmen wählen ihr Einzugsgebiet nach Bezirken.
//
// Quelle: Postleitzahlen der Schweiz von GeoNames (CC BY 4.0, aus dem npm-Paket swiss-zipcodes 1.0.9),
// abgeglichen mit der Ortschaftenliste der Post im selben Paket. Postleitzahlen, deren Hauptort in einem
// anderen Kanton liegt, zählen nicht dazu (z. B. 8212 Neuhausen SH, 8546 Islikon TG, 8500 Frauenfeld TG).
// Eine PLZ kann in zwei Bezirken liegen (8044 Zürich/Gockhausen, 8614 Bertschikon/Sulzbach).

export const BEZIRKE = [
  "Affoltern",
  "Andelfingen",
  "Bülach",
  "Dielsdorf",
  "Dietikon",
  "Hinwil",
  "Horgen",
  "Meilen",
  "Pfäffikon",
  "Uster",
  "Winterthur",
  "Zürich",
] as const;

export type Bezirk = (typeof BEZIRKE)[number];

const PLZ_PRO_BEZIRK: Record<Bezirk, string> = {
  "Affoltern":
    "8143 8906 8907 8908 8909 8910 8911 8912 8913 8914 8915 8925 8926 8932 8933 8934",
  "Andelfingen":
    "8245 8246 8247 8248 8414 8415 8416 8444 8447 8450 8451 8452 8453 8457 8458 8459 " +
    "8460 8461 8462 8463 8464 8465 8466 8467 8468 8475 8476 8477 8478",
  "Bülach":
    "8058 8060 8152 8180 8181 8182 8184 8185 8192 8193 8194 8195 8196 8197 8302 8303 " +
    "8304 8305 8309 8424 8425 8426 8427 8428",
  "Dielsdorf":
    "8105 8106 8107 8108 8112 8113 8114 8115 8153 8154 8155 8156 8157 8158 8162 8164 " +
    "8165 8166 8172 8173 8174 8175 8187",
  "Dietikon":
    "8010 8012 8102 8103 8104 8142 8901 8902 8903 8904 8951 8952 8953 8954 8955",
  "Hinwil":
    "8340 8342 8344 8345 8496 8497 8498 8607 8608 8614 8620 8623 8624 8625 8626 8627 " +
    "8630 8632 8633 8635 8636 8637",
  "Horgen":
    "8134 8135 8136 8800 8802 8803 8804 8805 8810 8815 8816 8820 8824 8825 8833 8942",
  "Meilen":
    "8125 8126 8127 8618 8634 8700 8702 8703 8704 8706 8707 8708 8712 8713 8714",
  "Pfäffikon":
    "8307 8308 8310 8312 8314 8315 8317 8320 8322 8330 8331 8332 8335 8484 8489 8492 " +
    "8493 8494 8499",
  "Uster":
    "8044 8117 8118 8121 8122 8123 8124 8132 8133 8306 8600 8602 8603 8604 8605 8606 " +
    "8610 8613 8614 8615 8616 8617",
  "Winterthur":
    "8311 8352 8353 8354 8400 8401 8403 8404 8405 8406 8408 8409 8412 8413 8418 8421 " +
    "8422 8442 8471 8472 8474 8479 8482 8483 8486 8487 8488 8495 8523 8542 8543 8544 " +
    "8545 8548",
  "Zürich":
    "8000 8001 8002 8003 8004 8005 8006 8008 8021 8022 8024 8027 8031 8032 8034 8036 " +
    "8037 8038 8040 8041 8042 8044 8045 8046 8047 8048 8049 8050 8051 8052 8053 8055 " +
    "8057 8063 8064 8070 8071 8074 8075 8080 8081 8085 8086 8087 8088 8090 8091 8092 " +
    "8093 8096 8098 8099",
};

const BEZIRKE_PRO_PLZ = new Map<string, Bezirk[]>();
for (const b of BEZIRKE) {
  for (const plz of PLZ_PRO_BEZIRK[b].split(" ")) BEZIRKE_PRO_PLZ.set(plz, [...(BEZIRKE_PRO_PLZ.get(plz) ?? []), b]);
}

export const istBezirk = (v: unknown): v is Bezirk => typeof v === "string" && (BEZIRKE as readonly string[]).includes(v);

/** Bezirke einer Postleitzahl; leer, wenn sie nicht im Kanton Zürich liegt. */
export function bezirkeVon(plz: string): Bezirk[] {
  return BEZIRKE_PRO_PLZ.get(plz.trim()) ?? [];
}

/** true, wenn die Postleitzahl im Kanton Zürich liegt. */
export function imKantonZuerich(plz: string): boolean {
  return bezirkeVon(plz).length > 0;
}

/** Für Preismodelle von vor dem 24.11.2026 mit PLZ-Kreisen (z. B. „8“): alle Bezirke mit passenden Postleitzahlen. */
export function bezirkeAusPlzKreisen(praefixe: string[]): Bezirk[] {
  return BEZIRKE.filter((b) => PLZ_PRO_BEZIRK[b].split(" ").some((plz) => praefixe.some((p) => p && plz.startsWith(p))));
}

/** Kurztext für die Anzeige, z. B. „ganzer Kanton Zürich“ oder „Bezirke Uster, Zürich“. */
export function bezirkeText(bezirke: readonly string[]): string {
  const gueltig = BEZIRKE.filter((b) => bezirke.includes(b));
  if (gueltig.length === 0) return "Kein Bezirk gewählt";
  if (gueltig.length === BEZIRKE.length) return "Ganzer Kanton Zürich";
  return `${gueltig.length === 1 ? "Bezirk" : "Bezirke"} ${gueltig.join(", ")}`;
}
