import { kontoStatusAendern } from "@/app/partner/actions";
import type { KontoStatus } from "@/lib/repo";

export const STATUS_TEXT: Record<KontoStatus, string> = { pruefung: "In Prüfung", aktiv: "Freigeschaltet", gesperrt: "Gesperrt" };

export function StatusKnopf({ id, status, label, dunkel = false }: { id: number; status: KontoStatus; label: string; dunkel?: boolean }) {
  return (
    <form action={kontoStatusAendern} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`btn btn--small ${dunkel ? "btn--dark" : "btn--outline"}`}>
        {label}
      </button>
    </form>
  );
}
