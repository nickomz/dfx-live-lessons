// Lector de archivos Lessons<IDIOMA>.txt.
//
// Acepta UTF-8 con o sin BOM y saltos LF o CRLF (Live lee las dos cosas). Cada línea
// se convierte en un bloque que guarda su texto original en `raw`.

import { IMAGE_FILE, parseInlines } from './inline';
import type { Block, Lesson, Page } from './model';

const BOM = '﻿';

/** Variables que Live reemplaza dentro del texto; una línea que empieza con ellas sigue siendo texto. */
const INLINE_VARIABLES = ['$Link', '$CommandMod', '$OptionMod', '$ShiftMod', '$ContextMenu', '$0'];

export function decode(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8').decode(bytes);
  return (text.startsWith(BOM) ? text.slice(1) : text).replace(/\r\n/g, '\n');
}

function isDirective(line: string): boolean {
  return line.startsWith('$') && !INLINE_VARIABLES.some((v) => line.startsWith(v));
}

function parseLine(raw: string, insideConditional: boolean): Block {
  const line = raw.trim();
  if (insideConditional || /^\$(If|Else|Endif)\b/.test(line)) return { type: 'unsupported', raw };
  if (line === '') return { type: 'blank', raw };
  if (line.startsWith('$TargetName')) return { type: 'target', name: line.slice('$TargetName'.length).trim(), raw };
  if (line.startsWith('$Comment')) return { type: 'comment', text: line.slice('$Comment'.length).trim(), raw };
  if (isDirective(line)) return { type: 'unsupported', raw };
  if (/^Divider\.tiff?$/i.test(line)) return { type: 'divider', raw };
  const img = IMAGE_FILE.exec(line);
  if (img) return img[2] === undefined ? { type: 'image', file: img[1]!, raw } : { type: 'image', file: img[1]!, alt: img[2], raw };
  if (raw.startsWith('-> ')) return { type: 'bullet', inlines: parseInlines(raw.slice(3)), raw };
  return { type: 'text', inlines: parseInlines(raw), raw };
}

export function parseLesson(input: Uint8Array | string): Lesson {
  const source = typeof input === 'string' ? undefined : input;
  const text = typeof input === 'string' ? input.replace(/\r\n/g, '\n') : decode(input);
  const lesson: Lesson = { preamble: [], pages: [] };
  if (source) lesson.source = source;

  let page: Page | undefined;
  let depth = 0;
  for (const raw of text.split('\n')) {
    if (/^\$Page\b/.test(raw)) {
      page = { title: raw.slice('$Page'.length).trim(), raw, blocks: [] };
      lesson.pages.push(page);
      continue;
    }
    if (!page) {
      lesson.preamble.push(raw);
      continue;
    }
    const trimmed = raw.trim();
    if (/^\$Endif\b/.test(trimmed)) depth = Math.max(0, depth - 1);
    page.blocks.push(parseLine(raw, depth > 0));
    if (/^\$If\b/.test(trimmed)) depth++;
  }
  return lesson;
}
