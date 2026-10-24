import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blocksToContent, contentToBlocks } from '../src/editor/convert';
import { exportFiles, newPage } from '../src/editor/document';
import { parseLesson, serializeLesson } from '../src/lesson';

const root = join(import.meta.dirname, '..');
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe('editor ↔ motor', () => {
  it.each(['docs/pruebas/test Lessons/LessonsES.txt', 'tests/fixtures/lode/LessonsEN.txt'])(
    '%s pasa por el editor sin cambios',
    (path) => {
      const bytes = new Uint8Array(readFileSync(join(root, path)));
      const lesson = parseLesson(bytes);
      for (const page of lesson.pages) page.blocks = contentToBlocks(blocksToContent(page.blocks));
      expect(serializeLesson(lesson)).toEqual(bytes);
    },
  );

  it('una línea editada pierde su texto original y sale en formato canónico', () => {
    const [block] = parseLesson('$Page P\nHola  ').pages[0]!.blocks;
    const content = blocksToContent([block!]);
    content[0]!.content = [{ type: 'text', text: 'Chau', marks: [{ type: 'bold' }] }];
    expect(contentToBlocks(content)).toEqual([{ type: 'text', inlines: [{ type: 'text', text: 'Chau', bold: true }] }]);
  });

  it('convierte viñetas, divisor y línea vacía', () => {
    const blocks = contentToBlocks([
      { type: 'paragraph', attrs: { bullet: true }, content: [{ type: 'text', text: 'Paso' }] },
      { type: 'divider' },
      { type: 'paragraph' },
    ]);
    expect(blocks).toEqual([
      { type: 'bullet', inlines: [{ type: 'text', text: 'Paso' }] },
      { type: 'divider' },
      { type: 'blank' },
    ]);
  });
});

describe('exportar', () => {
  it('arma los 7 idiomas con páginas, identificadores y formato', () => {
    const p1 = newPage([], 'Bienvenida');
    p1.doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'TITULO', marks: [{ type: 'bold' }] }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Texto con ' }, { type: 'text', text: 'cursiva', marks: [{ type: 'italic' }] }] },
        { type: 'paragraph', attrs: { bullet: true }, content: [{ type: 'text', text: 'Paso uno' }] },
        { type: 'divider' },
      ],
    };
    const p2 = newPage([p1], 'Segunda');
    const files = exportFiles([p1, p2]);
    expect(files.size).toBe(7);
    expect(dec(files.get('LessonsES.txt')!)).toBe(
      [
        '$Page Bienvenida',
        '$TargetName Pagina1',
        '*TITULO*',
        '',
        'Texto con /cursiva/',
        '-> Paso uno',
        'Divider.tif',
        '$Page Segunda',
        '$TargetName Pagina2',
        '',
        '',
      ].join('\n'),
    );
  });
});
