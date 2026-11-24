"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Fehlerliste } from "../Formulare";
import { neuesPasswortSetzen, passwortVergessen, type PasswortStatus } from "./actions";

const START: PasswortStatus = { fehler: [] };

export function PasswortVergessenForm() {
  const [status, action, laeuft] = useActionState(passwortVergessen, START);
  if (status.gesendet) {
    return (
      <div className="stack">
        <p className="banner banner--ok" role="status">
          Falls es ein Konto mit dieser E-Mail-Adresse gibt, haben wir Ihnen einen Link geschickt. Er gilt 1 Stunde. Bitte schauen Sie auch im
          Spam-Ordner nach.
        </p>
        <p className="muted">
          <Link href="/partner/login" style={{ textDecoration: "underline" }}>
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="stack">
      <Fehlerliste fehler={status.fehler} />
      <label className="field">
        E-Mail
        <input name="email" defaultValue={status.email} type="email" autoComplete="email" required />
      </label>
      <button type="submit" className="btn btn--dark" disabled={laeuft}>
        {laeuft ? "Wird gesendet …" : "Link senden"}
      </button>
      <p className="muted">
        <Link href="/partner/login" style={{ textDecoration: "underline" }}>
          Zurück zur Anmeldung
        </Link>
      </p>
    </form>
  );
}

export function NeuesPasswortForm({ token }: { token: string }) {
  const [status, action, laeuft] = useActionState(neuesPasswortSetzen, START);
  return (
    <form action={action} className="stack">
      <Fehlerliste fehler={status.fehler} />
      {status.abgelaufen && (
        <p className="muted">
          <Link href="/partner/passwort" style={{ textDecoration: "underline" }}>
            Neuen Link anfordern
          </Link>
        </p>
      )}
      <input type="hidden" name="t" value={token} />
      <label className="field">
        Neues Passwort (mindestens 10 Zeichen)
        <input name="passwort" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      <label className="field">
        Neues Passwort wiederholen
        <input name="passwort2" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      <button type="submit" className="btn btn--dark" disabled={laeuft}>
        {laeuft ? "Wird gespeichert …" : "Passwort speichern"}
      </button>
    </form>
  );
}
