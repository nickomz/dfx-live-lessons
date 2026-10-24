// Borrador automático: la lección abierta se guarda en el navegador (IndexedDB), imágenes
// incluidas, para que recargar o cerrar la pestaña no pierda nada. Nunca sale de la compu.

import type { EditorLesson } from '../editor/document';

const DB = 'dfx-live-lessons';
const STORE = 'draft';
const KEY = 'current';

export interface Draft {
  lesson: EditorLesson;
  current: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadDraft(): Promise<Draft | null> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Draft | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null; // Sin IndexedDB (modo privado, etc.) la app funciona igual, sin borrador.
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Guarda el borrador medio segundo después del último cambio. */
export function saveDraft(get: () => Draft) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const db = await open();
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(structuredClone(get()), KEY);
    } catch {
      // Sin borrador si el navegador no lo permite.
    }
  }, 500);
}
