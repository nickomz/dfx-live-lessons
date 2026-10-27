import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseLesson, serializeBlock, serializeLesson, serializeText, type Block } from '../src/lesson';

const root = join(import.meta.dirname, '..');
const read = (path: string) => new Uint8Array(readFileSync(join(root, path)));
const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

const types = (blocks: Block[]) => blocks.map((b) => b.type);

describe('lector', () => {
  it('reconoce cada tipo de línea', () => {
    const lesson = parseLesson(
      [
        '$Page Formato',
        '$TargetName Formato',
        '*TITULO*',
        '',
        '-> Viñeta',
        'img.png',
        'foto.png[alt="Una foto"]',
        'Divider.tif',
        '$Comment oculto',
        '$ListInTocForProduct 2B',
      ].join('\n'),
    );
    expect(lesson.pages).toHaveLength(1);
    expect(lesson.pages[0]!.title).toBe('Formato');
    expect(types(lesson.pages[0]!.blocks)).toEqual([
      'target', 'text', 'blank', 'bullet', 'image', 'image', 'divider', 'comment', 'unsupported',
    ]);
    expect(lesson.pages[0]!.blocks[5]).toMatchObject({ file: 'foto.png', alt: 'Una foto' });
  });

  it('trata como no soportado todo un bloque $If ... $Endif', () => {
    const lesson = parseLesson(['$Page P', '$If Product 02', 'Solo Suite', '$Else', 'Otro', '$Endif', 'Después'].join('\n'));
    expect(types(lesson.pages[0]!.blocks)).toEqual(['unsupported', 'unsupported', 'unsupported', 'unsupported', 'unsupported', 'text']);
  });

  it('una línea que empieza con una variable de Live sigue siendo texto', () => {
    const lesson = parseLesson('$Page P\n$CommandMod y clic\n$Link Ir <GotoPage:P>');
    expect(types(lesson.pages[0]!.blocks)).toEqual(['text', 'text']);
  });

  it('lee igual un archivo con BOM y con saltos de Windows', () => {
    const lf = parseLesson(enc('$Page P\n*Hola*\n'));
    const bomCrlf = parseLesson(enc('﻿$Page P\r\n*Hola*\r\n'));
    expect(bomCrlf.pages).toEqual(lf.pages);
  });
});

describe('round-trip', () => {
  it.each([
    'docs/pruebas/test Lessons/LessonsES.txt',
    'docs/pruebas/links Lessons/LessonsES.txt',
    'tests/fixtures/lode/LessonsEN.txt',
  ])('%s se escribe idéntico', (path) => {
    const bytes = read(path);
    expect(serializeLesson(parseLesson(bytes))).toEqual(bytes);
  });

  it.each([
    ['con BOM', '﻿$Page P\n*Hola*\n'],
    ['con CRLF', '$Page P\r\n*Hola*\r\nchau\r\n'],
    ['sin salto final', '$Page P\nHola'],
    ['con espacios al final de línea', '$Page P \n-> viñeta  \n'],
  ])('un archivo %s se escribe idéntico', (_, text) => {
    const bytes = enc(text);
    expect(serializeLesson(parseLesson(bytes))).toEqual(bytes);
  });

  it('si se edita, sale en UTF-8 sin BOM con LF y lo no editado queda igual', () => {
    const lesson = parseLesson(enc('﻿$Page P\r\n$If Product 02\r\nSuite\r\n$Endif\r\nviejo  \r\n'));
    const page = lesson.pages[0]!;
    page.blocks[3] = { type: 'text', inlines: [{ type: 'text', text: 'nuevo', bold: true }] };
    expect(dec(serializeLesson(lesson))).toBe('$Page P\n$If Product 02\nSuite\n$Endif\n*nuevo*\n');
  });

  it('una página nueva se escribe en el formato canónico', () => {
    const lesson = parseLesson('$Page Uno\n$TargetName Uno\n');
    lesson.pages.push({
      title: 'Dos',
      blocks: [
        { type: 'target', name: 'Dos' },
        { type: 'bullet', inlines: [{ type: 'text', text: 'Paso' }] },
        { type: 'image', file: 'img.png' },
        { type: 'divider' },
      ],
    });
    expect(serializeText(lesson)).toBe('$Page Uno\n$TargetName Uno\n\n$Page Dos\n$TargetName Dos\n-> Paso\nimg.png\nDivider.tif');
  });
});

describe('sublistas', () => {
  const EM = '\u2003';
  const text = (s: string) => [{ type: 'text' as const, text: s }];

  it('lee los tres niveles y vuelve a escribirlos igual', () => {
    const src = `$Page Uno\n-> Uno\n  -> Uno con espacios\n${EM}${EM}• Dos\n${EM}${EM}${EM}${EM}◦ Tres\n`;
    const lesson = parseLesson(src);
    expect(lesson.pages[0]!.blocks.slice(0, 4).map((b) => (b.type === 'bullet' ? [b.level ?? 1, b.inlines] : b.type))).toEqual([
      [1, text('Uno')],
      [1, text('Uno con espacios')],
      [2, text('Dos')],
      [3, text('Tres')],
    ]);
    expect(serializeText(lesson)).toBe(src);
  });

  it('una viñeta nueva de nivel 2 o 3 se escribe con la sangría de espacios anchos', () => {
    expect(serializeBlock({ type: 'bullet', level: 2, inlines: text('Dos') })).toBe(`${EM}${EM}• Dos`);
    expect(serializeBlock({ type: 'bullet', level: 3, inlines: text('Tres') })).toBe(`${EM}${EM}${EM}${EM}◦ Tres`);
  });

  it('un tab o un espacio duro antes de la flecha no es viñeta (en Live se ve la flecha)', () => {
    expect(parseLesson('$Page A\n\t-> x\n\u00a0-> y').pages[0]!.blocks.map((b) => b.type)).toEqual(['text', 'text']);
  });
});
