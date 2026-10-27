// Conversión entre los bloques del motor (src/lesson) y el documento del editor (TipTap).
//
// Una línea del archivo es un nodo del documento: párrafo (texto o viñeta), divisor, imagen
// o "preserved" para lo que el editor no edita (comentarios, $TargetName, bloques no
// soportados). Los nodos guardan `raw` para que lo que no se tocó se escriba igual.

import type { JSONContent } from '@tiptap/core';
import { parseInlines, readBullet, serializeBlock, serializeInlines, type Block, type Inline, type TextRun } from '../lesson';

function runToNode(run: TextRun, target?: string): JSONContent {
  const marks: JSONContent['marks'] = [];
  if (target !== undefined) marks.push({ type: 'link', attrs: { target } });
  if (run.bold) marks.push({ type: 'bold' });
  if (run.italic) marks.push({ type: 'italic' });
  return marks.length ? { type: 'text', text: run.text, marks } : { type: 'text', text: run.text };
}

function inlinesToNodes(inlines: Inline[]): JSONContent[] {
  return inlines.flatMap((n): JSONContent[] => {
    if (n.type === 'text') return [runToNode(n)];
    // Link con texto: el texto lleva la marca de link y se edita como cualquier texto.
    if (n.type === 'link' && n.label.type === 'text') return n.label.runs.map((r) => runToNode(r, n.target));
    // Link con imagen o de un tipo que el editor no ofrece: se conserva tal cual.
    return [{ type: 'preservedInline', attrs: { source: n.type === 'rawLink' ? n.source : serializeInlines([n]) } }];
  });
}

/** Agrega un tramo juntándolo con el anterior si tiene el mismo formato (texto canónico estable). */
function pushRun(runs: TextRun[], run: TextRun) {
  const prev = runs[runs.length - 1];
  if (prev && !!prev.bold === !!run.bold && !!prev.italic === !!run.italic) prev.text += run.text;
  else runs.push(run);
}

function nodesToInlines(nodes: JSONContent[] = []): Inline[] {
  const out: Inline[] = [];
  let link: { target: string; runs: TextRun[] } | null = null;
  const closeLink = () => {
    if (link) out.push({ type: 'link', target: link.target, label: { type: 'text', runs: link.runs } });
    link = null;
  };
  for (const node of nodes) {
    if (node.type === 'preservedInline') {
      closeLink();
      out.push(...parseInlines(String(node.attrs?.source ?? '')));
      continue;
    }
    if (node.type !== 'text' || !node.text) continue;
    const marks = node.marks ?? [];
    const run: TextRun = { type: 'text', text: node.text };
    if (marks.some((m) => m.type === 'bold')) run.bold = true;
    if (marks.some((m) => m.type === 'italic')) run.italic = true;
    const target = marks.find((m) => m.type === 'link')?.attrs?.target as string | undefined;
    if (target) {
      if (link && link.target !== target) closeLink();
      link ??= { target, runs: [] };
      pushRun(link.runs, run);
      continue;
    }
    closeLink();
    const prev = out[out.length - 1];
    if (prev?.type === 'text' && !!prev.bold === !!run.bold && !!prev.italic === !!run.italic) prev.text += run.text;
    else out.push(run);
  }
  closeLink();
  return out;
}

export function blocksToContent(blocks: Block[]): JSONContent[] {
  return blocks.map((block): JSONContent => {
    switch (block.type) {
      case 'text':
      case 'bullet':
        return {
          type: 'paragraph',
          attrs: { bullet: block.type === 'bullet', level: block.type === 'bullet' ? (block.level ?? 1) : 1, raw: block.raw ?? null },
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
  // Las imágenes pegadas que no se cargaron no van al archivo.
  return content.filter((node) => node.type !== 'pendingImage' && node.type !== 'pageBreak').map((node): Block => {
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
    const level = bullet ? (Number(node.attrs?.level) || 1) : 1;
    const block: Block =
      bullet && level > 1 ? { type: 'bullet', inlines, level: level as 2 | 3 } : { type: bullet ? 'bullet' : 'text', inlines };
    // Conserva la línea original si el contenido no cambió.
    if (raw !== undefined) {
      const was = readBullet(raw);
      const sameKind = bullet ? was?.level === level : !was;
      if (sameKind && sameInlines(parseInlines(was ? was.rest : raw), inlines)) return { ...block, raw };
    }
    return block;
  });
}
