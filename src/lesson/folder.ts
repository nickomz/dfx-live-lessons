// Una carpeta "<Set> Lessons" completa: un archivo por idioma más las imágenes.

import { decode, parseLesson } from './parse';
import { serializeLesson } from './serialize';
import type { Lesson } from './model';

/** Idiomas en los que Live 12 busca la lección, según el idioma de su interfaz. */
export const LANGUAGES = ['EN', 'ES', 'DE', 'FR', 'IT', 'JA', 'ZH'] as const;
export type Language = (typeof LANGUAGES)[number];

const LESSON_FILE = /^Lessons([A-Z]{2})(_Mac|_Pc)?\.txt$/;

export interface LessonFolder {
  /** Lección leída de cada archivo, por nombre de archivo (LessonsEN.txt, LessonsES_Mac.txt...). */
  lessons: Map<string, Lesson>;
  /** Imágenes y cualquier otro archivo, por ruta relativa a la carpeta (img.png, Large/img.png). */
  assets: Map<string, Uint8Array>;
  /** true si no todos los archivos de idioma tienen el mismo texto. */
  languagesDiffer: boolean;
}

/** Lee los archivos de una carpeta de lección (rutas relativas a la carpeta). */
export function readLessonFolder(files: Map<string, Uint8Array>): LessonFolder {
  const lessons = new Map<string, Lesson>();
  const assets = new Map<string, Uint8Array>();
  const texts = new Set<string>();
  for (const [path, bytes] of files) {
    if (LESSON_FILE.test(path)) {
      lessons.set(path, parseLesson(bytes));
      texts.add(decode(bytes).replace(/\n+$/, ''));
    } else {
      assets.set(path, bytes);
    }
  }
  return { lessons, assets, languagesDiffer: texts.size > 1 };
}

/** Archivos a exportar: la misma lección en los 7 idiomas, más las imágenes. */
export function lessonFiles(lesson: Lesson, assets: Map<string, Uint8Array>): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  const bytes = serializeLesson(lesson);
  for (const lang of LANGUAGES) out.set(`Lessons${lang}.txt`, bytes);
  for (const [path, data] of assets) out.set(path, data);
  return out;
}
