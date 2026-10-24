// La lección que se está editando: páginas con su título, su identificador para los
// links (`$TargetName`) y el contenido del editor, más lo que hace falta para que una
// lección abierta y no editada se vuelva a escribir idéntica.

import type { JSONContent } from '@tiptap/core';
import { lessonFiles, serializeText, type Lesson } from '../lesson';
import { usedAssets } from '../app/images';
import { blocksToContent, contentToBlocks } from './convert';

export interface EditorPage {
  title: string;
  /** Identificador estable para los links entre páginas; no cambia si se renombra la página. */
  target: string;
  doc: JSONContent;
  /** Línea `$Page` original y el título que tenía, para escribirla igual si no se renombró. */
  raw?: string;
  rawTitle?: string;
}

export interface EditorLesson {
  pages: EditorPage[];
  /** Líneas antes del primer `$Page` en un archivo abierto. */
  preamble: string[];
  /** Archivo de idioma original, si la lección se abrió de un archivo. */
  source?: Uint8Array;
  /** Imágenes y otros archivos de la carpeta, por ruta (img.png, Large/img.png). */
  assets: Map<string, Uint8Array>;
  /** Los archivos de idioma de la lección abierta tenían textos distintos. */
  languagesDiffer: boolean;
  setName: string;
}

export const emptyDoc = (): JSONContent => ({ type: 'doc', content: [{ type: 'paragraph' }] });

export function newPage(pages: EditorPage[], title = 'Nueva página'): EditorPage {
  const used = new Set(pages.map((p) => p.target));
  let n = pages.length + 1;
  while (used.has(`Pagina${n}`)) n++;
  return { title, target: `Pagina${n}`, doc: emptyDoc() };
}

export function newLesson(): EditorLesson {
  return { pages: [newPage([], 'Bienvenida')], preamble: [], assets: new Map(), languagesDiffer: false, setName: '' };
}

/** Pasa una lección leída de un archivo al editor. */
export function fromLesson(lesson: Lesson, extra: Partial<EditorLesson> = {}): EditorLesson {
  const pages: EditorPage[] = lesson.pages.map((page, i) => {
    const target = page.blocks.find((b) => b.type === 'target');
    const content = blocksToContent(page.blocks);
    const p: EditorPage = {
      title: page.title,
      target: target?.type === 'target' ? target.name : `Pagina${i + 1}`,
      doc: { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] },
    };
    if (page.raw !== undefined) {
      p.raw = page.raw;
      p.rawTitle = page.title;
    }
    return p;
  });
  const out: EditorLesson = { ...newLesson(), ...extra, pages: pages.length ? pages : newLesson().pages, preamble: lesson.preamble };
  if (lesson.source) out.source = lesson.source;
  return out;
}

/** Pasa la lección del editor al modelo del motor, listo para escribir. */
export function toLesson(edit: EditorLesson): Lesson {
  const lesson: Lesson = {
    preamble: edit.preamble,
    pages: edit.pages.map((p) => {
      const blocks = contentToBlocks(p.doc.content);
      // Las páginas leídas traen su $TargetName (o no lo tenían, y así siguen); las nuevas lo suman.
      if (p.raw === undefined && !blocks.some((b) => b.type === 'target')) blocks.unshift({ type: 'target', name: p.target });
      const title = p.title.trim() || 'Sin título';
      return p.raw !== undefined && p.rawTitle === p.title ? { title, raw: p.raw, blocks } : { title, blocks };
    }),
  };
  if (edit.source) {
    lesson.source = edit.source;
  } else if (!serializeText(lesson).endsWith('\n')) {
    // Las lecciones nuevas terminan con salto de línea, como los archivos de Ableton.
    lesson.pages[lesson.pages.length - 1]?.blocks.push({ type: 'blank' });
  }
  return lesson;
}

/** Archivos de la carpeta "<Set> Lessons", por ruta dentro de la carpeta. */
export function exportFiles(edit: EditorLesson): Map<string, Uint8Array> {
  const lesson = toLesson(edit);
  return lessonFiles(lesson, usedAssets(edit.assets, serializeText(lesson)));
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
export async function exportZip(edit: EditorLesson, setName: string): Promise<Uint8Array> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const folder = zip.folder(`${setName} Lessons`)!;
  for (const [path, data] of exportFiles(edit)) folder.file(path, data);
  return zip.generateAsync({ type: 'uint8array' });
}
