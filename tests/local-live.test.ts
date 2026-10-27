// Prueba local: round-trip con todas las lecciones que traen Live y los Packs instalados.
// Esas lecciones son de Ableton y no se copian al repo; si la máquina no tiene Live,
// la prueba se saltea. Se pueden sumar carpetas con LESSONS_DIRS (separadas por ":").

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseLesson, parseInlines, readBullet, serializeBlock, serializeLesson, type Block, type Inline } from '../src/lesson';

function lessonDirs(): string[] {
  const dirs = [join(homedir(), 'Music/Ableton/Factory Packs'), join(homedir(), 'Music/Ableton/User Library')];
  const apps = '/Applications/Ableton Live';
  if (existsSync(apps)) {
    for (const app of readdirSync(apps)) if (app.endsWith('.app')) dirs.push(join(apps, app, 'Contents/App-Resources'));
  }
  for (const d of (process.env.LESSONS_DIRS ?? '').split(':')) if (d) dirs.push(d);
  return dirs.filter((d) => existsSync(d));
}

function lessonFilesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((p) => /(^|\/)Lessons[A-Z]{2}(_Mac|_Pc)?\.txt$/.test(p))
    .map((p) => join(dir, p));
}

const files = lessonDirs().flatMap(lessonFilesIn);

// Sin `raw`, un bloque se escribe en el formato canónico; volver a leerlo tiene que dar lo mismo.
/** Junta los tramos de texto seguidos (sin formato) para comparar solo el texto visible. */
function merge(inlines: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const n of inlines) {
    const last = out[out.length - 1];
    if (n.type === 'text' && last?.type === 'text') out[out.length - 1] = { type: 'text', text: last.text + n.text };
    else out.push(n.type === 'text' ? { type: 'text', text: n.text } : n);
  }
  return out;
}

function withoutRaw(block: Block): Block {
  if (block.type === 'unsupported') return block;
  const { raw: _raw, ...rest } = block;
  return rest as Block;
}

describe.skipIf(files.length === 0)(`lecciones instaladas (${files.length} archivos)`, () => {
  it('se escriben idénticas, byte por byte', () => {
    const failed = files.filter((f) => {
      const bytes = new Uint8Array(readFileSync(f));
      return !Buffer.from(serializeLesson(parseLesson(bytes))).equals(Buffer.from(bytes));
    });
    expect(failed).toEqual([]);
  });

  // Lo que la app escribe, al volver a leerlo y escribirlo, da lo mismo, y el texto visible no cambia.
  // (El formato puede moverse a palabras enteras: así lo lee Live.)
  it('cada viñeta y línea de texto se reescribe en formato canónico sin cambiar su texto', () => {
    const failed: string[] = [];
    const visible = (inlines: Inline[]) => JSON.stringify(inlines.map((n) => (n.type === 'text' ? n.text : n)));
    for (const f of files) {
      for (const page of parseLesson(new Uint8Array(readFileSync(f))).pages) {
        for (const block of page.blocks) {
          if (block.type !== 'text' && block.type !== 'bullet') continue;
          const read = (line: string) => parseInlines(block.type === 'bullet' ? readBullet(line)!.rest : line);
          const canonical = serializeBlock(withoutRaw(block));
          const again = serializeBlock({ ...withoutRaw(block), inlines: read(canonical) } as typeof block);
          const sameText = visible(merge(read(canonical))) === visible(merge(block.inlines));
          if (again !== canonical || !sameText) failed.push(`${f}: ${block.raw}`);
        }
      }
    }
    expect(failed.slice(0, 20)).toEqual([]);
  });
});
