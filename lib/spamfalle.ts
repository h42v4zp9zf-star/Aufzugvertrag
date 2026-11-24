// Spam-Falle (Verbesserung Nr. 32, 24.11.2026): ein unsichtbares Feld „webseite“ in den öffentlichen Formularen.
// Menschen sehen es nicht, Programme füllen es aus. Ohne Node-Module, damit es auch im Browser-Code verwendet werden kann.

/** Name des unsichtbaren Feldes. */
export const SPAM_FELD = "webseite";

/** Antwort, wenn das unsichtbare Feld ausgefüllt ist. */
export const MELDUNG_SPAM = "Ihre Angaben konnten nicht gesendet werden. Bitte laden Sie die Seite neu und versuchen Sie es noch einmal.";

/** true, wenn das unsichtbare Feld ausgefüllt ist (dann war es kein Mensch). */
export function istSpam(wert: unknown): boolean {
  return typeof wert === "string" && wert.trim() !== "";
}
