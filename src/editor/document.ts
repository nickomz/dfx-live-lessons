// La lección que se está editando: páginas con su título, su identificador para los
// links (`$TargetName`) y el contenido del editor.

import type { JSONContent } from '@tiptap/core';
import { lessonFiles, type Lesson } from '../lesson';
import { contentToBlocks } from './convert';

export interface EditorPage {
  title: string;
  /** Identificador estable para los links entre páginas; no cambia si se renombra la página. */
  target: string;
  doc: JSONContent;
}

export const emptyDoc = (): JSONContent => ({ type: 'doc', content: [{ type: 'paragraph' }] });

export function newPage(pages: EditorPage[], title = 'Nueva página'): EditorPage {
  const used = new Set(pages.map((p) => p.target));
  let n = pages.length + 1;
  while (used.has(`Pagina${n}`)) n++;
  return { title, target: `Pagina${n}`, doc: emptyDoc() };
}

/** Pasa las páginas del editor al modelo del motor, listo para escribir. */
export function toLesson(pages: EditorPage[]): Lesson {
  const lesson: Lesson = {
    preamble: [],
    pages: pages.map((p) => ({
      title: p.title.trim() || 'Sin título',
      blocks: [{ type: 'target', name: p.target }, ...contentToBlocks(p.doc.content)],
    })),
  };
  // Termina con salto de línea, como los archivos de Ableton.
  lesson.pages[lesson.pages.length - 1]?.blocks.push({ type: 'blank' });
  return lesson;
}

/** Archivos de la carpeta "<Set> Lessons", por ruta dentro de la carpeta. */
export function exportFiles(pages: EditorPage[]): Map<string, Uint8Array> {
  return lessonFiles(toLesson(pages), new Map());
}

/** Limpia el nombre del set: sin ".als" ni caracteres que no van en un nombre de archivo. */
export function cleanSetName(name: string): string {
  return name
    .trim()
    .replace(/\.als$/i, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();
}

/** El zip "<Set> Lessons.zip" con la carpeta "<Set> Lessons/" adentro. */
export async function exportZip(pages: EditorPage[], setName: string): Promise<Uint8Array> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const folder = zip.folder(`${setName} Lessons`)!;
  for (const [path, data] of exportFiles(pages)) folder.file(path, data);
  return zip.generateAsync({ type: 'uint8array' });
}
