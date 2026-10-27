// Formato dentro de una línea: negrita, cursiva y links.
//
// Probado en Live 12.4.7 (docs/formato.md, "Negrita y cursiva"): un `*` o una `/` abre formato
// solo al principio de la línea o después de un espacio, y si lo sigue algo que no es espacio;
// cierra solo si lo sigue un espacio o el fin de la línea. Por eso "pads/texturas", "1/4" o
// "3 * 4" se ven literales, pero "/cursiva/." no cierra y la cursiva sigue hasta el fin de la
// página. No hay negrita y cursiva juntas, y un marcador que cierra sin haber abierto desaparece.
// No hay forma de escapar: la app pone un espacio de ancho cero (U+200B) al lado de un `*` o
// una `/` literal que Live tomaría como marcador.

import { linkKind } from './links';
import type { Inline, LinkLabel, TextRun } from './model';

// El espacio antes de "<" es opcional: la lección de Lode tiene "$Link *Fors*<https://fors.fm>".
const LINK = /\$Link (.+?)\s*<([^<>]*)>/g;
export const IMAGE_FILE = /^(\S+\.(?:png|tiff?|jpe?g|gif))(?:\[alt="(.*)"\])?$/i;

const ZWSP = '\u200b';
const isSpace = (c: string | undefined) => c !== undefined && /\s/.test(c);
const isMarker = (c: string | undefined) => c === '*' || c === '/';

/** Live abre formato con este carácter: al principio o después de un espacio, y pegado a lo que sigue. */
const opens = (s: string, i: number) => (i === 0 || isSpace(s[i - 1])) && s[i + 1] !== undefined && !isSpace(s[i + 1]);
/** Live cierra formato con este carácter: pegado a lo anterior y antes de un espacio o del fin. */
const closes = (s: string, i: number) => i > 0 && !isSpace(s[i - 1]) && (s[i + 1] === undefined || isSpace(s[i + 1]));

/**
 * Parte un texto sin links en tramos con negrita o cursiva, como lo muestra Live. Los
 * formatos se apilan: en "*negrita /cursiva/ sigue*" la cursiva se ve sin negrita y después
 * vuelve la negrita (nunca las dos juntas). Si un marcador abre y no cierra, en Live el
 * formato sigue hasta el fin de la página; acá llega hasta el fin del texto.
 */
export function parseEmphasis(s: string): TextRun[] {
  const runs: TextRun[] = [];
  const stack: ('*' | '/')[] = [];
  let text = '';
  const flush = () => {
    // Los espacios de ancho cero que puso la app al lado de un marcador literal no son texto.
    const clean = text.replace(/\u200b(?=[*/])|(?<=[*/])\u200b/g, '');
    const style = stack[stack.length - 1];
    if (clean) runs.push(run(clean, style === '*', style === '/'));
    text = '';
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (isMarker(ch) && !stack.includes(ch as '*' | '/') && opens(s, i)) {
      flush();
      stack.push(ch as '*' | '/');
    } else if (isMarker(ch) && closes(s, i)) {
      // Cierra ese formato (y lo que se abrió adentro); si no estaba abierto, Live no lo muestra.
      flush();
      const at = stack.lastIndexOf(ch as '*' | '/');
      if (at >= 0) stack.length = at;
    } else {
      text += ch;
    }
  }
  flush();
  return runs;
}

function run(text: string, bold: boolean, italic: boolean): TextRun {
  const r: TextRun = { type: 'text', text };
  if (bold) r.bold = true;
  else if (italic) r.italic = true;
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

type Style = '*' | '/' | '';
const styleOf = (r: TextRun): Style => (r.bold ? '*' : r.italic ? '/' : '');

/**
 * Escribe tramos con formato como los lee Live: los marcadores van al borde de palabras
 * enteras (si se marcó media palabra o la palabra lleva un punto pegado, el formato toma la
 * palabra entera, signos incluidos) y, si un tramo tiene negrita y cursiva, queda en negrita.
 * Los `*` y `/` literales que Live tomaría como marcador llevan un espacio de ancho cero.
 */
function serializeRuns(runs: TextRun[], glueBefore = false, glueAfter = false): string {
  const chars: { c: string; style: Style }[] = runs.flatMap((r) => [...r.text].map((c) => ({ c, style: styleOf(r) })));
  // Cada palabra (lo que hay entre espacios) toma el formato de su primer carácter con formato.
  const words: { text: string; style: Style; space: boolean }[] = [];
  for (const { c, style } of chars) {
    const space = isSpace(c);
    const last = words[words.length - 1];
    if (last && last.space === space) {
      last.text += c;
      if (!space && !last.style) last.style = style;
    } else {
      words.push({ text: c, style: space ? '' : style, space });
    }
  }
  // Una palabra pegada a un link no puede llevar formato: el marcador no tendría un espacio al lado.
  if (glueBefore && words[0] && !words[0].space) words[0].style = '';
  const lastWord = words[words.length - 1];
  if (glueAfter && lastWord && !lastWord.space) lastWord.style = '';
  // Los espacios entre dos palabras con el mismo formato quedan adentro de ese formato.
  words.forEach((w, k) => {
    if (w.space && words[k - 1]?.style && words[k - 1]!.style === words[k + 1]?.style) w.style = words[k - 1]!.style;
  });
  let out = '';
  words.forEach((w, k) => {
    const open = w.style && !w.space && words[k - 1]?.style !== w.style;
    const close = w.style && !w.space && words[k + 1]?.style !== w.style;
    const glued = { before: !!open || (k === 0 && glueBefore), after: !!close || (k === words.length - 1 && glueAfter) };
    out += (open ? w.style : '') + escapeMarkers(w.text, glued.before, glued.after) + (close ? w.style : '');
  });
  return out;
}

/** Agrega un espacio de ancho cero al lado de cada `*` o `/` que Live tomaría como marcador. */
function escapeMarkers(word: string, afterMarker: boolean, beforeMarker: boolean): string {
  let out = '';
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!;
    // Lo que hay alrededor en la línea: un marcador propio pegado no es espacio.
    const ctx = (afterMarker ? 'x' : ' ') + word + (beforeMarker ? 'x' : ' ');
    const at = i + 1;
    if (isMarker(c) && opens(ctx, at)) out += ZWSP + c;
    else if (isMarker(c) && closes(ctx, at)) out += c + ZWSP;
    else out += c;
  }
  return out;
}

function serializeLink(n: Exclude<Inline, TextRun>): string {
  if (n.type === 'rawLink') return n.source;
  const l = n.label;
  const label = l.type === 'image' ? (l.alt === undefined ? l.file : `${l.file}[alt="${l.alt}"]`) : serializeRuns(l.runs);
  return `$Link ${label} <${n.target}>`;
}

/** Escribe el contenido de una línea en el formato canónico. */
export function serializeInlines(inlines: Inline[]): string {
  let out = '';
  let runs: TextRun[] = [];
  // Los tramos de texto seguidos se escriben juntos: una palabra puede tener partes con formato.
  const flush = (glueAfter: boolean) => {
    if (runs.length) out += serializeRuns(runs, out !== '' && !isSpace(out[out.length - 1]), glueAfter);
    runs = [];
  };
  for (const n of inlines) {
    if (n.type === 'text') {
      runs.push(n);
    } else {
      flush(true);
      out += serializeLink(n);
    }
  }
  flush(false);
  return out;
}
