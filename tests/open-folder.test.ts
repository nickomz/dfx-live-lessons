// Abrir carpetas grandes: la búsqueda recorre solo nombres, hasta 2 niveles, y corta
// enseguida si hay demasiadas entradas sin ninguna lección (por ejemplo, el Escritorio).

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { scanLessons, type Dir, type OpenedFolder } from '../src/app/open';

let reads = 0;

/** Una carpeta del disco como Dir, contando cuántos archivos se leen. */
function diskDir(path: string, name = path.split('/').pop()!): Dir {
  return {
    name,
    list: async () =>
      readdirSync(path, { withFileTypes: true }).map((e) =>
        e.isDirectory()
          ? diskDir(join(path, e.name), e.name)
          : {
              name: e.name,
              read: async () => {
                reads++;
                return new Uint8Array(readFileSync(join(path, e.name)));
              },
            },
      ),
  };
}

const root = mkdtempSync(join(tmpdir(), 'dfx-open-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function fakeDesktop(withLesson: boolean): string {
  const desk = join(root, withLesson ? 'Escritorio con proyecto' : 'Escritorio');
  // 40 carpetas con 100 archivos cada una: 4000 archivos, como un Escritorio cargado.
  for (let d = 0; d < 40; d++) {
    const dir = join(desk, `Carpeta ${d}`);
    mkdirSync(dir, { recursive: true });
    for (let f = 0; f < 100; f++) writeFileSync(join(dir, `archivo ${f}.wav`), 'x');
  }
  if (withLesson) {
    const lesson = join(desk, 'Clase Project', 'Clase Lessons');
    mkdirSync(join(lesson, 'Large'), { recursive: true });
    writeFileSync(join(desk, 'Clase Project', 'Clase.als'), 'als');
    writeFileSync(join(lesson, 'LessonsES.txt'), '$Page Hola\n');
    writeFileSync(join(lesson, 'img.png'), 'png');
    writeFileSync(join(lesson, 'Large', 'img.png'), 'png2');
  }
  return desk;
}

describe('abrir una carpeta grande', () => {
  it('sin lecciones, corta enseguida sin leer ningún archivo', async () => {
    reads = 0;
    const start = performance.now();
    const result = await scanLessons(diskDir(fakeDesktop(false)));
    expect(result).toBe('too-many');
    expect(reads).toBe(0);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('si adentro hay un proyecto con lección, la encuentra y lee solo sus archivos', async () => {
    reads = 0;
    const result = (await scanLessons(diskDir(fakeDesktop(true)))) as OpenedFolder[];
    expect(result.map((f) => [f.setName, f.path, [...f.files.keys()].sort()])).toEqual([
      ['Clase', 'Clase Project/Clase Lessons', ['Large/img.png', 'LessonsES.txt', 'img.png']],
    ]);
    expect(reads).toBe(3);
  });

  it('la carpeta de la lección misma se abre directo', async () => {
    const desk = join(root, 'Escritorio con proyecto');
    const result = (await scanLessons(diskDir(join(desk, 'Clase Project', 'Clase Lessons')))) as OpenedFolder[];
    expect(result.map((f) => [f.setName, f.path])).toEqual([['Clase', '']]);
  });

  it('no baja más de 2 niveles', async () => {
    const deep = join(root, 'Hondo', 'a', 'b', 'Clase Lessons');
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, 'LessonsES.txt'), '$Page Hola\n');
    expect(await scanLessons(diskDir(join(root, 'Hondo')))).toEqual([]);
  });
});
