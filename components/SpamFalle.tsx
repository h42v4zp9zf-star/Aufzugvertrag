import { SPAM_FELD } from "@/lib/spamfalle";

/**
 * Unsichtbares Feld gegen Spam (Verbesserung Nr. 32): Menschen sehen und erreichen es nicht,
 * Programme füllen es aus. Ist es ausgefüllt, speichert der Server nichts.
 * Die data-Attribute halten Passwort-Manager davon ab, es automatisch auszufüllen.
 */
export function SpamFalle() {
  return (
    <div className="spamfalle" aria-hidden="true">
      <label>
        Webseite (bitte leer lassen)
        <input
          type="text"
          name={SPAM_FELD}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
          data-1p-ignore=""
          data-lpignore="true"
          data-bwignore=""
          data-form-type="other"
        />
      </label>
    </div>
  );
}
