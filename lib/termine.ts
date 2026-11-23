// Terminkalender für die Beratung vor Ort (Wunsch Dario, 23.11.2026):
// Montag bis Freitag, 7 bis 17 Uhr, Schweizer Zeit. Pro Zeitfenster ein Termin.
// Daten werden als Text „JJJJ-MM-TT“ und Zeiten als „HH:MM“ geführt, damit keine
// Zeitzonen-Umrechnung dazwischenkommt (der Server läuft in UTC).

/** Dauer eines Termins in Minuten. Hier ändern, z. B. 120 für 2 Stunden. */
export const TERMIN_DAUER_MIN = 60;
export const TAG_START_STUNDE = 7;
export const TAG_ENDE_STUNDE = 17;
/** So viele Kalendertage im Voraus kann gebucht werden (ab morgen). */
export const TAGE_IM_VORAUS = 28;

const ZONE = "Europe/Zurich";
const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const zwei = (n: number) => String(n).padStart(2, "0");

function alsUtc(datum: string): Date {
  const [j, m, t] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t));
}

function alsText(d: Date): string {
  return `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`;
}

export function plusTage(datum: string, tage: number): string {
  const d = alsUtc(datum);
  d.setUTCDate(d.getUTCDate() + tage);
  return alsText(d);
}

/** 0 = Sonntag … 6 = Samstag */
export function wochentag(datum: string): number {
  return alsUtc(datum).getUTCDay();
}

/** Heutiges Datum in der Schweiz, unabhängig von der Zeitzone des Servers. */
export function heuteInZuerich(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(jetzt);
}

/** Ostersonntag (gregorianisch, Algorithmus von Meeus/Jones/Butcher). */
function ostersonntag(jahr: number): string {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jahr}-${zwei(monat)}-${zwei(tag)}`;
}

/** Gesetzliche Feiertage im Kanton Zürich (an diesen Tagen keine Termine). */
export function feiertageZuerich(jahr: number): Set<string> {
  const ostern = ostersonntag(jahr);
  return new Set([
    `${jahr}-01-01`, // Neujahr
    `${jahr}-01-02`, // Berchtoldstag
    plusTage(ostern, -2), // Karfreitag
    plusTage(ostern, 1), // Ostermontag
    `${jahr}-05-01`, // Tag der Arbeit
    plusTage(ostern, 39), // Auffahrt
    plusTage(ostern, 50), // Pfingstmontag
    `${jahr}-08-01`, // Bundesfeier
    `${jahr}-12-25`, // Weihnachten
    `${jahr}-12-26`, // Stephanstag
  ]);
}

export function istArbeitstag(datum: string): boolean {
  const w = wochentag(datum);
  if (w === 0 || w === 6) return false;
  return !feiertageZuerich(Number(datum.slice(0, 4))).has(datum);
}

/** Startzeiten eines Tages, z. B. 07:00, 08:00 … 16:00 bei 60 Minuten. */
export function startzeiten(dauerMin: number = TERMIN_DAUER_MIN): string[] {
  const zeiten: string[] = [];
  for (let min = TAG_START_STUNDE * 60; min + dauerMin <= TAG_ENDE_STUNDE * 60; min += dauerMin) {
    zeiten.push(`${zwei(Math.floor(min / 60))}:${zwei(min % 60)}`);
  }
  return zeiten;
}

export function endzeit(zeit: string, dauerMin: number = TERMIN_DAUER_MIN): string {
  const [h, m] = zeit.split(":").map(Number);
  const ende = h * 60 + m + dauerMin;
  return `${zwei(Math.floor(ende / 60))}:${zwei(ende % 60)}`;
}

/** Alle Kalendertage von morgen bis heute + TAGE_IM_VORAUS (auch Wochenenden, für die Anzeige). */
export function kalenderTage(heute: string, anzahl: number = TAGE_IM_VORAUS): string[] {
  return Array.from({ length: anzahl }, (_, i) => plusTage(heute, i + 1));
}

export function terminGueltig(datum: string, zeit: string, heute: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || alsText(alsUtc(datum)) !== datum) return false;
  if (!kalenderTage(heute).includes(datum)) return false;
  return istArbeitstag(datum) && startzeiten().includes(zeit);
}

export const terminSchluessel = (datum: string, zeit: string) => `${datum} ${zeit}`;

/** z. B. „Montag, 24. November 2026, 08:00–09:00 Uhr“ */
export function terminText(datum: string, zeit: string): string {
  const d = alsUtc(datum);
  return `${WOCHENTAGE[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONATE[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${zeit}–${endzeit(zeit)} Uhr`;
}
