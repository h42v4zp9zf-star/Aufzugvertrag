/** Adresse der Liegenschaft, mit der PLZ, falls sie separat erfasst wurde (Beratung, seit 24.11.2026)
 *  und nicht schon in der Adresse steht. Ohne Abhängigkeiten, damit auch der Browser-Code sie nutzen kann. */
export function liegenschaftText(k: { adresse: string; plz?: string }): string {
  const plz = k.plz?.trim() ?? "";
  return plz && !k.adresse.includes(plz) ? `${k.adresse}, ${plz}` : k.adresse;
}
