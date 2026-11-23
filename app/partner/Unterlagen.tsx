"use client";

// Vertragsunterlagen der Liftfirma (Wunsch Dario 23.11.2026): freiwillig, nur PDF.

import { useActionState, useEffect, useRef, useState } from "react";
import { groesseText } from "@/lib/dokumente";
import { unterlageEntfernen, unterlageHochladen, type FormStatus } from "./actions";
import { Fehlerliste } from "./Formulare";

const START: FormStatus = { fehler: [] };
const MAX_BYTES = 4 * 1024 * 1024;

export interface UnterlageZeile {
  id: number;
  dateiname: string;
  groesse: number;
  datum: string;
}

function Loeschen({ id, name, onLoeschen }: { id: number; name: string; onLoeschen: () => void }) {
  const [fragen, setFragen] = useState(false);
  if (!fragen)
    return (
      <button type="button" className="linkbtn" onClick={() => setFragen(true)} aria-label={`${name} löschen`}>
        Löschen
      </button>
    );
  return (
    <form action={unterlageEntfernen} className="inline-form unterlagen__frage" onSubmit={onLoeschen}>
      <input type="hidden" name="id" value={id} />
      <span className="muted">Wirklich löschen?</span>
      <button type="submit" className="btn btn--small btn--dark">
        Ja, löschen
      </button>
      <button type="button" className="btn btn--small btn--outline" onClick={() => setFragen(false)}>
        Abbrechen
      </button>
    </form>
  );
}

export function Unterlagen({ liste, max }: { liste: UnterlageZeile[]; max: number }) {
  const [status, action, laeuft] = useActionState(unterlageHochladen, START);
  const [fehler, setFehler] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [ok, setOk] = useState(false);
  const letzterStatus = useRef(status);

  // Nach erfolgreichem Hochladen das Dateifeld leeren und kurz bestätigen.
  useEffect(() => {
    if (status === letzterStatus.current) return;
    letzterStatus.current = status;
    setOk(!!status.gespeichert);
    if (status.gespeichert) setFormKey((k) => k + 1);
  }, [status]);

  const voll = liste.length >= max;
  return (
    <div className="stack" style={{ gap: 16 }}>
      {liste.length > 0 && (
        <ul className="unterlagen">
          {liste.map((u) => (
            <li key={u.id}>
              <a href={`/partner/unterlage/${u.id}`} className="unterlagen__name">
                {u.dateiname}
              </a>
              <span className="muted">
                {groesseText(u.groesse)} · {u.datum}
              </span>
              <Loeschen id={u.id} name={u.dateiname} onLoeschen={() => setOk(false)} />
            </li>
          ))}
        </ul>
      )}
      {voll ? (
        <p className="muted">Sie haben {max} Unterlagen hochgeladen. Löschen Sie eine, um eine neue hochzuladen.</p>
      ) : (
        <form
          key={formKey}
          action={action}
          className="unterlagen__form"
          onSubmit={(e) => {
            const datei = (e.currentTarget.elements.namedItem("unterlage") as HTMLInputElement | null)?.files?.[0];
            setOk(false);
            if (datei && datei.size > MAX_BYTES) {
              e.preventDefault();
              setFehler("Die Datei ist zu gross. Bitte höchstens 4 MB.");
            } else setFehler(null);
          }}
        >
          <label className="field">
            PDF-Datei (bis 4 MB)
            <input type="file" name="unterlage" accept="application/pdf,.pdf" required />
          </label>
          <button type="submit" className="btn btn--dark btn--small" disabled={laeuft}>
            {laeuft ? "Wird hochgeladen …" : "Hochladen"}
          </button>
        </form>
      )}
      <Fehlerliste fehler={fehler ? [fehler] : status.fehler} />
      {ok && (
        <p className="muted" role="status">
          Unterlage gespeichert.
        </p>
      )}
    </div>
  );
}
