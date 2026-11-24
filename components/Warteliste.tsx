"use client";

// E-Mail hinterlassen (Paket 2, Verbesserungen Nr. 8 und 23): wenn die PLZ ausserhalb des Kantons Zürich
// liegt oder es für die Anlage noch kein Angebot gibt. Die Adressen sieht Dario in der Verwaltung.
import { useState, useTransition } from "react";
import { aufWarteliste } from "@/app/warteliste/actions";
import { SpamFalle } from "@/components/SpamFalle";
import type { WartelisteGrund } from "@/lib/repo";
import { SPAM_FELD } from "@/lib/spamfalle";

export function Warteliste({ plz, grund, danke }: { plz: string; grund: WartelisteGrund; danke: string }) {
  const [fertig, setFertig] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, starte] = useTransition();

  if (fertig) {
    return (
      <p className="banner banner--ok" role="status">
        {danke}
      </p>
    );
  }
  return (
    <form
      className="warteliste"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setFehler(null);
        starte(async () => {
          let r;
          try {
            r = await aufWarteliste({ email: String(f.get("email") ?? ""), plz, grund, webseite: String(f.get(SPAM_FELD) ?? "") });
          } catch {
            setFehler("Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
            return;
          }
          if (r.ok) setFertig(true);
          else setFehler(r.fehler);
        });
      }}
    >
      <label className="field">
        E-Mail-Adresse
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <SpamFalle />
      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}
      <button type="submit" className="btn btn--dark" disabled={laeuft}>
        {laeuft ? "Wird gesendet …" : "Benachrichtigen"}
      </button>
    </form>
  );
}
