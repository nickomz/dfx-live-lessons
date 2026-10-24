// Formato dentro de una línea: negrita, cursiva y links.
//
// Probado en Live 12.4.7 (docs/formato.md): `*` y `/` solo marcan formato al borde de
// una palabra. "pads/texturas/drones", "1/4", "3 * 4" o "nota*importante" se ven
// literales, así que no hace falta escapar nada.

import { linkKind } from './links';
import type { Inline, LinkLabel, TextRun } from './model';

const LINK = /\$Link (.+?) <([^<>]*)>/g;
export const IMAGE_FILE = /^(\S+\.(?:png|tiff?|jpe?g|gif))(?:\[alt="(.*)"\])?$/i;

const OPEN_BEFORE = /[\s(\[«"“'¡¿]/;
const CLOSE_AFTER = /[\s.,;:!?)\]»"”'…-]/;

function canOpen(s: string, i: number): boolean {
  const next = s[i + 1];
  return (i === 0 || OPEN_BEFORE.test(s[i - 1]!)) && next !== undefined && !/\s/.test(next);
}

function canClose(s: string, j: number): boolean {
  const after = s[j + 1];
  return !/\s/.test(s[j - 1]!) && (after === undefined || CLOSE_AFTER.test(after));
}

/** Parte un texto sin links en tramos con negrita y cursiva. */
export function parseEmphasis(s: string, bold = false, italic = false): TextRun[] {
  const runs: TextRun[] = [];
  let plain = '';
  const flush = () => {
    if (plain) runs.push(run(plain, bold, italic));
    plain = '';
  };
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    const isBold = ch === '*' && !bold;
    const isItalic = ch === '/' && !italic;
    if ((isBold || isItalic) && canOpen(s, i)) {
      let j = i + 2;
      while (j < s.length && !(s[j] === ch && canClose(s, j))) j++;
      if (j < s.length) {
        flush();
        runs.push(...parseEmphasis(s.slice(i + 1, j), bold || isBold, italic || isItalic));
        i = j + 1;
        continue;
      }
    }
    plain += ch;
    i++;
  }
  flush();
  return runs;
}

function run(text: string, bold: boolean, italic: boolean): TextRun {
  const r: TextRun = { type: 'text', text };
  if (bold) r.bold = true;
  if (italic) r.italic = true;
  return r;
}

function parseLabel(label: string): LinkLabel {
  const img = IMAGE_FILE.exec(label);
  if (img) return img[2] === undefined ? { type: 'image', file: img[1]! } : { type: 'image', file: img[1]!, alt: img[2] };
  return { type: 'text', runs: parseEmphasis(label) };
}

/** Lee el contenido de una línea de texto o viñeta. */
export function parseInlines(s: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(LINK)) {
    out.push(...parseEmphasis(s.slice(last, m.index)));
    const [source, label, target] = m as unknown as [string, string, string];
    out.push(linkKind(target) ? { type: 'link', target, label: parseLabel(label) } : { type: 'rawLink', source });
    last = m.index + source.length;
  }
  out.push(...parseEmphasis(s.slice(last)));
  return out;
}

function serializeRuns(runs: TextRun[]): string {
  return runs
    .map((r) => {
      let t = r.text;
      if (r.italic) t = `/${t}/`;
      if (r.bold) t = `*${t}*`;
      return t;
    })
    .join('');
}

/** Escribe el contenido de una línea en el formato canónico. */
export function serializeInlines(inlines: Inline[]): string {
  return inlines
    .map((n) => {
      switch (n.type) {
        case 'text':
          return serializeRuns([n]);
        case 'rawLink':
          return n.source;
        case 'link': {
          const l = n.label;
          const label =
            l.type === 'image' ? (l.alt === undefined ? l.file : `${l.file}[alt="${l.alt}"]`) : serializeRuns(l.runs);
          return `$Link ${label} <${n.target}>`;
        }
      }
    })
    .join('');
}
