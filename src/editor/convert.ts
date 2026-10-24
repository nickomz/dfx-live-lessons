// Conversión entre los bloques del motor (src/lesson) y el documento del editor (TipTap).
//
// Una línea del archivo es un nodo del documento: párrafo (texto o viñeta), divisor, imagen
// o "preserved" para lo que el editor no edita (comentarios, $TargetName, bloques no
// soportados). Los nodos guardan `raw` para que lo que no se tocó se escriba igual.

import type { JSONContent } from '@tiptap/core';
import { parseInlines, serializeBlock, serializeInlines, type Block, type Inline, type TextRun } from '../lesson';

function runToNode(run: TextRun): JSONContent {
  const marks = [];
  if (run.bold) marks.push({ type: 'bold' });
  if (run.italic) marks.push({ type: 'italic' });
  return marks.length ? { type: 'text', text: run.text, marks } : { type: 'text', text: run.text };
}

function inlinesToNodes(inlines: Inline[]): JSONContent[] {
  return inlines.map((n) =>
    n.type === 'text'
      ? runToNode(n)
      : { type: 'preservedInline', attrs: { source: n.type === 'rawLink' ? n.source : serializeInlines([n]) } },
  );
}

function nodesToInlines(nodes: JSONContent[] = []): Inline[] {
  const out: Inline[] = [];
  for (const node of nodes) {
    if (node.type === 'preservedInline') {
      out.push(...parseInlines(String(node.attrs?.source ?? '')));
      continue;
    }
    if (node.type !== 'text' || !node.text) continue;
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    const run: TextRun = { type: 'text', text: node.text };
    if (marks.has('bold')) run.bold = true;
    if (marks.has('italic')) run.italic = true;
    // Junta tramos seguidos con el mismo formato para que el texto canónico sea estable.
    const prev = out[out.length - 1];
    if (prev?.type === 'text' && !!prev.bold === !!run.bold && !!prev.italic === !!run.italic) prev.text += run.text;
    else out.push(run);
  }
  return out;
}

export function blocksToContent(blocks: Block[]): JSONContent[] {
  return blocks.map((block): JSONContent => {
    switch (block.type) {
      case 'text':
      case 'bullet':
        return {
          type: 'paragraph',
          attrs: { bullet: block.type === 'bullet', raw: block.raw ?? null },
          content: inlinesToNodes(block.inlines),
        };
      case 'blank':
        return { type: 'paragraph', attrs: { bullet: false, raw: block.raw ?? null } };
      case 'divider':
        return { type: 'divider', attrs: { raw: block.raw ?? null } };
      case 'image':
        return { type: 'image', attrs: { file: block.file, alt: block.alt ?? null, raw: block.raw ?? null } };
      default:
        return { type: 'preserved', attrs: { block: JSON.stringify(block) } };
    }
  });
}

function sameInlines(a: Inline[], b: Inline[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function contentToBlocks(content: JSONContent[] = []): Block[] {
  return content.map((node): Block => {
    if (node.type === 'divider') {
      const raw = node.attrs?.raw;
      return typeof raw === 'string' ? { type: 'divider', raw } : { type: 'divider' };
    }
    if (node.type === 'preserved') return JSON.parse(String(node.attrs?.block)) as Block;
    if (node.type === 'image') {
      const file = String(node.attrs?.file ?? '');
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : undefined;
      const raw = typeof node.attrs?.raw === 'string' ? node.attrs.raw : undefined;
      const block: Block = alt === undefined ? { type: 'image', file } : { type: 'image', file, alt };
      // La línea original sigue valiendo mientras la imagen sea la misma.
      return raw !== undefined && serializeBlock(block) === raw.trim() ? { ...block, raw } : block;
    }

    const raw = typeof node.attrs?.raw === 'string' ? node.attrs.raw : undefined;
    const bullet = !!node.attrs?.bullet;
    const inlines = nodesToInlines(node.content);
    if (!bullet && inlines.length === 0) {
      return raw !== undefined && raw.trim() === '' ? { type: 'blank', raw } : { type: 'blank' };
    }
    const type = bullet ? 'bullet' : 'text';
    // Conserva la línea original si el contenido no cambió.
    if (raw !== undefined) {
      const wasBullet = raw.startsWith('-> ');
      if (wasBullet === bullet && sameInlines(parseInlines(bullet ? raw.slice(3) : raw), inlines)) {
        return { type, inlines, raw };
      }
    }
    return { type, inlines };
  });
}
