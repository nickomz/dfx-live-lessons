import { describe, expect, it } from 'vitest';
import { imageName, usedAssets } from '../src/app/images';
import { blocksToContent, contentToBlocks } from '../src/editor/convert';
import { exportFiles, newLesson, newPage } from '../src/editor/document';
import { parseLesson } from '../src/lesson';

describe('nombres de imagen', () => {
  it.each([
    ['Captura de pantalla 2026-10-24 a las 14.02.jpg', 'Captura-de-pantalla-2026-10-24-a-las-14-02.png'],
    ['Señal ñandú.PNG', 'Senal-nandu.png'],
    ['image.png', 'imagen-1.png'],
    [undefined, 'imagen-1.png'],
  ])('%s → %s', (original, name) => {
    expect(imageName(original, new Set())).toBe(name);
  });

  it('no repite nombres ya usados', () => {
    expect(imageName('kick.png', new Set(['kick.png']))).toBe('kick-1.png');
    expect(imageName('image.png', new Set(['imagen-1.png']))).toBe('imagen-2.png');
  });
});

describe('imágenes en el editor', () => {
  it('una imagen leída se conserva igual, alt incluido', () => {
    const blocks = parseLesson('$Page P\nfoto.png[alt="Una foto"]\nimg.png\n').pages[0]!.blocks;
    expect(contentToBlocks(blocksToContent(blocks))).toEqual(blocks);
  });

  it('una imagen agregada en el editor sale como una línea con su nombre', () => {
    expect(contentToBlocks([{ type: 'image', attrs: { file: 'kick.png' } }])).toEqual([{ type: 'image', file: 'kick.png' }]);
  });
});

describe('exportar imágenes', () => {
  it('incluye las imágenes usadas con su copia en Large/ y deja afuera las borradas y las originales', () => {
    const page = newPage([], 'Uno');
    page.doc = { type: 'doc', content: [{ type: 'image', attrs: { file: 'kick.png' } }] };
    const assets = new Map([
      ['kick.png', new Uint8Array([1])],
      ['Large/kick.png', new Uint8Array([2])],
      ['borrada.png', new Uint8Array([3])],
      ['Large/borrada.png', new Uint8Array([4])],
      ['Originales/kick.png', new Uint8Array([5])],
    ]);
    const files = exportFiles({ ...newLesson(), pages: [page], assets });
    expect([...files.keys()].filter((k) => !k.startsWith('Lessons'))).toEqual(['kick.png', 'Large/kick.png']);
    expect(new TextDecoder().decode(files.get('LessonsES.txt'))).toContain('\nkick.png\n');
  });

  it('conserva lo que no es imagen y las imágenes mencionadas en el texto', () => {
    const assets = new Map([['notas.pdf', new Uint8Array([1])], ['Beats.png', new Uint8Array([2])]]);
    expect([...usedAssets(assets, '$Link Beats.png <GotoPage:X>').keys()]).toEqual(['notas.pdf', 'Beats.png']);
  });
});
