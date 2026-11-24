"use client";

import Link from "next/link";
import { useActionState } from "react";
import { einloggen, registrieren, type FormStatus } from "./actions";

const START: FormStatus = { fehler: [] };

export function Fehlerliste({ fehler }: { fehler: string[] }) {
  if (fehler.length === 0) return null;
  return (
    <ul className="errors" role="alert">
      {fehler.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}

export function LoginForm() {
  const [status, action, laeuft] = useActionState(einloggen, START);
  return (
    <form action={action} className="stack">
      <Fehlerliste fehler={status.fehler} />
      <label className="field">
        E-Mail
        <input name="email" defaultValue={status.werte?.email} type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Passwort
        <input name="passwort" type="password" autoComplete="current-password" required />
      </label>
      <p className="muted" style={{ marginTop: -4 }}>
        <Link href="/partner/passwort" style={{ textDecoration: "underline" }}>
          Passwort vergessen?
        </Link>
      </p>
      <button type="submit" className="btn btn--dark" disabled={laeuft}>
        {laeuft ? "Wird geprüft …" : "Anmelden"}
      </button>
      <p className="muted">
        Noch kein Konto? <Link href="/partner/registrieren" style={{ textDecoration: "underline" }}>Als Liftfirma registrieren</Link>
      </p>
    </form>
  );
}

export function RegistrierenForm() {
  const [status, action, laeuft] = useActionState(registrieren, START);
  return (
    <form action={action} className="stack">
      <Fehlerliste fehler={status.fehler} />
      <label className="field">
        Firmenname
        <input name="firma" defaultValue={status.werte?.firma} autoComplete="organization" required />
      </label>
      <label className="field">
        UID-Nummer
        <input name="uid" defaultValue={status.werte?.uid} placeholder="CHE-123.456.789" required />
      </label>
      <label className="field">
        E-Mail
        <input name="email" defaultValue={status.werte?.email} type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Passwort (mindestens 10 Zeichen)
        <input name="passwort" type="password" autoComplete="new-password" minLength={10} required />
      </label>
      <button type="submit" className="btn btn--dark" disabled={laeuft}>
        {laeuft ? "Wird gesendet …" : "Konto beantragen"}
      </button>
      <p className="muted">
        Wir prüfen jede Firma, bevor ihre Preise im Vergleich erscheinen. Bereits registriert?{" "}
        <Link href="/partner/login" style={{ textDecoration: "underline" }}>Anmelden</Link>
      </p>
    </form>
  );
}
