// Fotos der Checkliste, die noch nicht hochgeladen sind, liegen im Speicher des Handys
// (IndexedDB). So geht im Keller ohne Empfang nichts verloren. Nur im Browser verwenden.

export interface WartendesFoto {
  id: string;
  beratungId: number;
  gross: Blob;
  klein: Blob;
}

const DB_NAME = "elevaris-checkliste";
const STORE = "fotos";
let ersatz: Map<string, WartendesFoto> | null = null; // falls IndexedDB fehlt (z. B. privates Fenster)

function oeffnen(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

async function mitStore<T>(modus: IDBTransactionMode, arbeit: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await oeffnen();
  if (!db) return undefined;
  return new Promise((ok, fehler) => {
    const tx = db.transaction(STORE, modus);
    const req = arbeit(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      ok(req.result);
    };
    tx.onerror = () => {
      db.close();
      fehler(tx.error);
    };
  });
}

export async function fotoMerken(f: WartendesFoto): Promise<void> {
  try {
    if ((await mitStore("readwrite", (s) => s.put(f))) !== undefined) return;
  } catch {
    // weiter mit Ersatz
  }
  (ersatz ??= new Map()).set(f.id, f);
}

export async function wartendeFotos(beratungId: number): Promise<WartendesFoto[]> {
  let alle: WartendesFoto[] = [];
  try {
    alle = ((await mitStore("readonly", (s) => s.getAll())) as WartendesFoto[] | undefined) ?? [];
  } catch {
    alle = [];
  }
  const zusatz = ersatz ? [...ersatz.values()] : [];
  return [...alle, ...zusatz].filter((f) => f.beratungId === beratungId);
}

export async function fotoVergessen(id: string): Promise<void> {
  ersatz?.delete(id);
  try {
    await mitStore("readwrite", (s) => s.delete(id));
  } catch {
    // nichts zu tun
  }
}
