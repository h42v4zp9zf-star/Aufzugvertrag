// Mehrwertsteuer separat ausweisen (Entscheid Dario, 24.11.2026): Preise exkl. MWST,
// darunter die MWST und der Betrag inkl. MWST, auf 5 Rappen gerundet.
import { MWST_SATZ_PROZENT } from "./config.ts";

/** z. B. „8,1 %“ */
export const MWST_SATZ_TEXT = `${String(MWST_SATZ_PROZENT).replace(".", ",")} %`;

const auf5Rappen = (chf: number) => Math.round(chf * 20) / 20;

/** Betrag inkl. MWST, auf 5 Rappen gerundet. */
export function inklMwst(betragExklChf: number): number {
  return auf5Rappen(betragExklChf * (1 + MWST_SATZ_PROZENT / 100));
}

/** „CHF 2'518.75“: mit Rappen und geradem Apostroph, auf Server und im Browser gleich. */
export function chfRappen(betrag: number): string {
  const rappen = Math.round(betrag * 100);
  const franken = String(Math.trunc(rappen / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `CHF ${franken}.${String(Math.abs(rappen % 100)).padStart(2, "0")}`;
}

/** z. B. „inkl. 8,1 % MWST: CHF 2'518.75“ */
export function inklMwstText(betragExklChf: number): string {
  return `inkl. ${MWST_SATZ_TEXT} MWST: ${chfRappen(inklMwst(betragExklChf))}`;
}
