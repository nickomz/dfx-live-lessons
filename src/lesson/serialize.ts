// Escritor de archivos Lessons<IDIOMA>.txt.
//
// Si la lección no cambió, devuelve el archivo original byte por byte (BOM y CRLF
// incluidos). Si cambió, escribe UTF-8 sin BOM con saltos LF: las líneas que nadie
// tocó salen con su texto original y las editadas, en el formato canónico.

import { serializeInlines } from './inline';
import { decode } from './parse';
import type { Block, Lesson } from './model';

export function serializeBlock(block: Block): string {
  if (block.raw !== undefined) return block.raw;
  switch (block.type) {
    case 'text':
      return serializeInlines(block.inlines);
    case 'bullet':
      return `-> ${serializeInlines(block.inlines)}`;
    case 'image':
      return block.alt === undefined ? block.file : `${block.file}[alt="${block.alt}"]`;
    case 'divider':
      return 'Divider.tif';
    case 'blank':
      return '';
    case 'comment':
      return `$Comment ${block.text}`;
    case 'target':
      return `$TargetName ${block.name}`;
    case 'unsupported':
      return block.raw;
  }
}

export function serializeText(lesson: Lesson): string {
  const lines = [...lesson.preamble];
  for (const page of lesson.pages) {
    lines.push(page.raw ?? `$Page ${page.title}`);
    for (const block of page.blocks) lines.push(serializeBlock(block));
  }
  return lines.join('\n');
}

export function serializeLesson(lesson: Lesson): Uint8Array {
  const text = serializeText(lesson);
  if (lesson.source && text === decode(lesson.source)) return lesson.source;
  return new TextEncoder().encode(text);
}
