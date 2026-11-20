"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { beratungSenden } from "./actions";

export function BeratungForm() {
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);
  const [laeuft, starten] = useTransition();

  if (gesendet) {
    return (
      <div className="card" role="status">
        <h2>Danke für Ihre Buchung</h2>
        <p className="muted">Wir melden uns in den nächsten Arbeitstagen bei Ihnen, um einen Termin vor Ort abzumachen.</p>
        <Link href="/" className="btn btn--outline">
          Zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <form
      className="stack"
      // Ohne action={...}, damit die Eingaben nach einem Fehler stehen bleiben.
      onSubmit={(e) => {
        e.preventDefault();
        const daten = new FormData(e.currentTarget);
        setFehler(null);
        starten(async () => {
          const r = await beratungSenden(daten);
          if (r.ok) setGesendet(true);
          else setFehler(r.fehler);
        });
      }}
    >
      <label className="field">
        Name *
        <input name="name" autoComplete="name" required />
      </label>
      <label className="field">
        E-Mail *
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Telefon *
        <input name="telefon" type="tel" autoComplete="tel" required />
      </label>
      <label className="field">
        Adresse der Liegenschaft *
        <input name="adresse" autoComplete="street-address" placeholder="Strasse Nr., PLZ Ort" required />
      </label>
      <label className="field">
        Anzahl Aufzüge
        <input name="anzahl" inputMode="numeric" defaultValue="1" />
      </label>
      <label className="field">
        Bemerkung oder Wunschtermin
        <textarea name="bemerkung" rows={4} />
      </label>
      <label className="check">
        <input type="checkbox" name="pauschale" required />
        Ich nehme zur Kenntnis: Anfangspauschale CHF 130, danach Abrechnung nach Aufwand, per Rechnung.
      </label>
      {fehler && (
        <p className="error" role="alert">
          {fehler}
        </p>
      )}
      <button type="submit" className="btn btn--dark" disabled={laeuft}>
        {laeuft ? "Wird gesendet …" : "Beratung verbindlich buchen"}
      </button>
    </form>
  );
}
