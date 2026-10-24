import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blocksToContent, contentToBlocks } from '../src/editor/convert';
import JSZip from 'jszip';
import { cleanSetName, exportFiles, exportZip, fromLesson, newLesson, newPage } from '../src/editor/document';
import { dirFromMap, readZip, scanLessons, type OpenedFolder } from '../src/app/open';
import { readLessonFolder } from '../src/lesson';
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
    const files = exportFiles({ ...newLesson(), pages: [p1, p2] });
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

describe('zip', () => {
  it('limpia el nombre del set', () => {
    expect(cleanSetName('  Clase 03 - House.als ')).toBe('Clase 03 - House');
    expect(cleanSetName('a/b:c')).toBe('abc');
  });

  it('arma "<Set> Lessons.zip" con la carpeta y los 7 idiomas adentro', async () => {
    const bytes = await exportZip({ ...newLesson(), pages: [newPage([], 'Uno')] }, 'Clase 03');
    const zip = await JSZip.loadAsync(bytes);
    const files = Object.keys(zip.files).filter((p) => !zip.files[p]!.dir).sort();
    expect(files).toEqual(
      ['DE', 'EN', 'ES', 'FR', 'IT', 'JA', 'ZH'].map((l) => `Clase 03 Lessons/Lessons${l}.txt`),
    );
    expect(await zip.file('Clase 03 Lessons/LessonsES.txt')!.async('string')).toBe('$Page Uno\n$TargetName Pagina1\n\n');
  });
});

describe('abrir una lección', () => {
  it.each(['docs/pruebas/test Lessons/LessonsES.txt', 'docs/pruebas/links Lessons/LessonsES.txt', 'tests/fixtures/lode/LessonsEN.txt'])(
    '%s abierta y exportada sin tocar sale idéntica',
    (path) => {
      const bytes = new Uint8Array(readFileSync(join(root, path)));
      const files = exportFiles(fromLesson(parseLesson(bytes)));
      expect(files.get('LessonsES.txt')).toEqual(bytes);
    },
  );

  it('si se renombra una página, solo cambia esa línea', () => {
    const edit = fromLesson(parseLesson(new TextEncoder().encode('$Page Uno \n$TargetName X\nHola\n')));
    edit.pages[0]!.title = 'Dos';
    edit.source = undefined;
    expect(dec(exportFiles(edit).get('LessonsEN.txt')!)).toBe('$Page Dos\n$TargetName X\nHola\n');
  });

  it('encuentra la carpeta "<Set> Lessons" dentro de un zip y toma el nombre del set', async () => {
    const zip = await exportZip({ ...newLesson(), pages: [newPage([], 'Uno')] }, 'Clase 03');
    const [folder] = (await scanLessons(dirFromMap(await readZip(zip)))) as [OpenedFolder];
    expect(folder.setName).toBe('Clase 03');
    expect([...folder.files.keys()]).toContain('LessonsES.txt');
    const read = readLessonFolder(folder.files);
    expect(read.languagesDiffer).toBe(false);
    // Volver a exportar lo abierto da el mismo archivo.
    const again = exportFiles(fromLesson(read.lessons.get('LessonsES.txt')!));
    expect(again.get('LessonsES.txt')).toEqual(folder.files.get('LessonsES.txt'));
  });

  it('ignora archivos de sistema y conserva las imágenes', async () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    const [folder] = (await scanLessons(dirFromMap(new Map([
      ['MZ Lessons/LessonsES.txt', enc('$Page A\n')],
      ['MZ Lessons/img.png', new Uint8Array([1])],
      ['MZ Lessons/.DS_Store', new Uint8Array([0])],
      ['__MACOSX/MZ Lessons/._img.png', new Uint8Array([0])],
    ])))) as OpenedFolder[];
    expect(folder!.setName).toBe('MZ');
    expect([...folder!.files.keys()].sort()).toEqual(['LessonsES.txt', 'img.png']);
  });
});

describe('abrir la carpeta de un proyecto', () => {
  const enc = (s: string) => new TextEncoder().encode(s);

  it('encuentra cada lección del proyecto, con su nombre de set', async () => {
    const folders = (await scanLessons(dirFromMap(new Map([
      ['Clase Project/Clase.als', new Uint8Array([1])],
      ['Clase Project/Clase Lessons/LessonsES.txt', enc('$Page A\n')],
      ['Clase Project/Ejercicio 2 Lessons/LessonsES.txt', enc('$Page B\n')],
      ['Clase Project/Ejercicio 2 Lessons/Large/img.png', new Uint8Array([2])],
      ['Clase Project/Samples/kick.wav', new Uint8Array([3])],
    ])))) as OpenedFolder[];
    expect(folders.map((f) => [f.setName, f.path, [...f.files.keys()].sort()])).toEqual([
      ['Clase', 'Clase Lessons', ['LessonsES.txt']],
      ['Ejercicio 2', 'Ejercicio 2 Lessons', ['Large/img.png', 'LessonsES.txt']],
    ]);
  });

  it('no encuentra nada si no hay ningún archivo de lección', async () => {
    expect(await scanLessons(dirFromMap(new Map([['Proyecto/set.als', new Uint8Array([1])], ['Proyecto/notas.txt', enc('hola')]])))).toEqual([]);
  });
});
