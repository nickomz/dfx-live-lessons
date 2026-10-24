// Nodos del editor. Solo existe lo que Live muestra (docs/formato.md): párrafos con
// negrita y cursiva, viñetas y la línea divisoria. Lo demás se conserva como "preserved".

import { InputRule, Node } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';
import type { Block } from '../lesson';

/** Párrafo de Live. `bullet` lo convierte en viñeta ("-> " en el archivo). */
export const LessonParagraph = Paragraph.extend({
  addAttributes() {
    return {
      bullet: {
        default: false,
        keepOnSplit: true,
        parseHTML: (el) => el.getAttribute('data-bullet') === 'true',
        renderHTML: (attrs) => (attrs.bullet ? { 'data-bullet': 'true' } : {}),
      },
      raw: { default: null, keepOnSplit: false, rendered: false },
    };
  },

  addInputRules() {
    // Escribir "- ", "-> " o "• " al principio de una línea la convierte en viñeta.
    return [
      new InputRule({
        find: /^(->|-|•)\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).updateAttributes('paragraph', { bullet: true }).run();
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    const unbullet = () => {
      const { $from, empty } = this.editor.state.selection;
      if (!empty || !$from.parent.attrs.bullet) return false;
      return this.editor.commands.updateAttributes('paragraph', { bullet: false });
    };
    return {
      // Enter en una viñeta vacía termina la lista; Backspace al principio saca la viñeta.
      Enter: () => this.editor.state.selection.$from.parent.content.size === 0 && unbullet(),
      Backspace: () => this.editor.state.selection.$from.parentOffset === 0 && unbullet(),
    };
  },
});

export const Divider = Node.create({
  name: 'divider',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { raw: { default: null, rendered: false } };
  },
  parseHTML() {
    return [{ tag: 'hr' }];
  },
  renderHTML() {
    return ['hr', { class: 'lv-divider' }];
  },
});

function preservedLabel(block: Block): { label: string; hidden: boolean } {
  switch (block.type) {
    case 'comment':
    case 'target':
      return { label: '', hidden: true };
    case 'image':
      return { label: `Imagen: ${block.file}`, hidden: false };
    default:
      return { label: block.raw ?? '', hidden: false };
  }
}

/** Línea que el editor no edita: se ve como bloque gris (o no se ve, si Live tampoco la muestra). */
export const Preserved = Node.create({
  name: 'preserved',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { block: { default: '{}', rendered: false } };
  },
  renderHTML({ node }) {
    const { label, hidden } = preservedLabel(JSON.parse(String(node.attrs.block)) as Block);
    return ['div', { class: hidden ? 'lv-preserved lv-hidden' : 'lv-preserved', contenteditable: 'false' }, label];
  },
});

/** Link u otro elemento dentro de una línea que el editor todavía no edita. */
export const PreservedInline = Node.create({
  name: 'preservedInline',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { source: { default: '', rendered: false } };
  },
  renderHTML({ node }) {
    return ['span', { class: 'lv-preserved-inline', contenteditable: 'false' }, String(node.attrs.source)];
  },
});
