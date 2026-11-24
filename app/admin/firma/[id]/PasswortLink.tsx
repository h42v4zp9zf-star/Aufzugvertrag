"use client";

// Verwaltung: Link zum Zurücksetzen des Passworts erstellen und der Firma selbst schicken
// (Entscheid Dario 24.11.2026), solange Resend nur an Dario senden darf.
import { useActionState, useState } from "react";
import { passwortLinkErstellen, type LinkStatus } from "@/app/partner/passwort/actions";

export function PasswortLink({ id }: { id: number }) {
  const [status, action, laeuft] = useActionState<LinkStatus, FormData>(passwortLinkErstellen, {});
  const [kopiert, setKopiert] = useState<string | null>(null);

  async function kopieren(url: string, feld: HTMLInputElement | null) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      feld?.select();
      document.execCommand("copy");
    }
    setKopiert(url);
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="muted">
        Hat die Firma ihr Passwort vergessen, erstellen Sie hier einen Link und schicken ihn der Firma selbst, z.B. per E-Mail. Der Link gilt 24
        Stunden und funktioniert einmal. Ein neuer Link macht den alten ungültig.
      </p>
      {status.fehler && (
        <p className="error" role="alert">
          {status.fehler}
        </p>
      )}
      {status.url && (
        <div className="link-feld">
          <input
            readOnly
            value={status.url}
            aria-label="Link zum Zurücksetzen des Passworts"
            onFocus={(e) => e.currentTarget.select()}
            id={`pw-link-${id}`}
          />
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => kopieren(status.url!, document.getElementById(`pw-link-${id}`) as HTMLInputElement | null)}
          >
            {kopiert === status.url ? "Kopiert" : "Kopieren"}
          </button>
        </div>
      )}
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn btn--outline" disabled={laeuft}>
          {laeuft ? "Wird erstellt …" : status.url ? "Neuen Link erstellen" : "Link zum Zurücksetzen erstellen"}
        </button>
      </form>
    </div>
  );
}
