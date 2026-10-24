import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blocksToContent, contentToBlocks } from '../src/editor/convert';
import { exportFiles, fromLesson, newLesson, newPage } from '../src/editor/document';
import { parseLesson, serializeLesson } from '../src/lesson';

const root = join(import.meta.dirname, '..');
const dec = (b: Uint8Array) => new TextDecoder().decode(b);
const link = (target: string) => ({ type: 'link', attrs: { target } });

describe('links en el editor', () => {
  it('un link de texto se edita como texto con marca de link y vuelve igual', () => {
    const blocks = parseLesson('$Page P\nMirá $Link el *video* <https://youtube.com/x> ya\n').pages[0]!.blocks;
    const content = blocksToContent(blocks);
    expect(content[0]!.content).toEqual([
      { type: 'text', text: 'Mirá ' },
      { type: 'text', text: 'el ', marks: [link('https://youtube.com/x')] },
      { type: 'text', text: 'video', marks: [link('https://youtube.com/x'), { type: 'bold' }] },
      { type: 'text', text: ' ya' },
    ]);
    expect(contentToBlocks(content)).toEqual(blocks);
  });

  it('un link creado en el editor sale como $Link', () => {
    const blocks = contentToBlocks([
      { type: 'paragraph', content: [{ type: 'text', text: 'Escribime', marks: [link('mailto:a@b.com')] }] },
      { type: 'paragraph', attrs: { bullet: true }, content: [{ type: 'text', text: 'Ejercicio 2', marks: [link('Set:Ejercicio 2.als')] }] },
    ]);
    const edit = { ...newLesson(), pages: [{ ...newPage([], 'Uno'), doc: { type: 'doc', content: blocksToContent(blocks) } }] };
    expect(dec(exportFiles(edit).get('LessonsES.txt')!)).toBe(
      '$Page Uno\n$TargetName Pagina1\n$Link Escribime <mailto:a@b.com>\n-> $Link Ejercicio 2 <Set:Ejercicio 2.als>\n',
    );
  });

  it('dos links seguidos a destinos distintos no se mezclan', () => {
    const blocks = contentToBlocks([
      { type: 'paragraph', content: [{ type: 'text', text: 'A', marks: [link('GotoPage:X')] }, { type: 'text', text: 'B', marks: [link('GotoPage:Y')] }] },
    ]);
    expect(blocks[0]).toMatchObject({ inlines: [{ target: 'GotoPage:X' }, { target: 'GotoPage:Y' }] });
  });

  it('la lección de prueba de links (mailto y Set) pasa por el editor sin cambios', () => {
    const bytes = new Uint8Array(readFileSync(join(root, 'docs/pruebas/links Lessons/LessonsES.txt')));
    expect(exportFiles(fromLesson(parseLesson(bytes))).get('LessonsES.txt')).toEqual(bytes);
  });

  it('una página sin $TargetName lo recibe solo si un link le apunta', () => {
    const edit = fromLesson(parseLesson('$Page Uno\nHola\n$Page Dos\nChau\n'));
    expect(serializeLesson(parseLesson(dec(exportFiles(edit).get('LessonsES.txt')!)))).toBeTruthy();
    expect(dec(exportFiles(edit).get('LessonsES.txt')!)).toBe('$Page Uno\nHola\n$Page Dos\nChau\n');
    edit.source = undefined;
    edit.pages[0]!.doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Seguí', marks: [link(`GotoPage:${edit.pages[1]!.target}`)] }] }] };
    expect(dec(exportFiles(edit).get('LessonsES.txt')!)).toBe('$Page Uno\n$Link Seguí <GotoPage:Pagina2>\n$Page Dos\n$TargetName Pagina2\nChau\n');
  });
});

describe('última página vacía', () => {
  it('lleva una línea en blanco: si no, Live no carga la lección (probado en 12.4.7)', () => {
    const edit = { ...newLesson(), pages: [newPage([], 'Uno'), newPage([newPage([], 'Uno')], 'Dos')] };
    edit.pages[0]!.doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }] };
    expect(dec(exportFiles(edit).get('LessonsES.txt')!)).toBe('$Page Uno\n$TargetName Pagina1\nHola\n$Page Dos\n$TargetName Pagina2\n\n');
  });
});
