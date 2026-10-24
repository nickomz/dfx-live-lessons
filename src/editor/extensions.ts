// Nodos del editor. Solo existe lo que Live muestra (docs/formato.md): párrafos con
// negrita y cursiva, viñetas y la línea divisoria. Lo demás se conserva como "preserved".

import { InputRule, Mark, Node, mergeAttributes } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';
import { t } from '../app/strings';
import { buildTarget, type Block } from '../lesson';

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

export interface LessonImageOptions {
  /** Devuelve la URL para mostrar un archivo de la lección, o null si no está. */
  resolve: (file: string) => string | null;
}

/** Imagen de Live: una línea con el nombre del archivo PNG, de 260 px de ancho. */
export const LessonImage = Node.create<LessonImageOptions>({
  name: 'image',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addOptions() {
    return { resolve: () => null };
  },
  addAttributes() {
    return {
      file: { default: '', rendered: false },
      alt: { default: null, rendered: false },
      raw: { default: null, rendered: false },
    };
  },
  renderHTML({ node }) {
    const file = String(node.attrs.file);
    const src = this.options.resolve(file);
    return src
      ? ['figure', { class: 'lv-image', contenteditable: 'false' }, ['img', { src, alt: String(node.attrs.alt ?? file), draggable: 'false' }]]
      : ['figure', { class: 'lv-image missing', contenteditable: 'false' }, t.imageMissing(file)];
  },
});

/** Link de Live ($Link texto <destino>): a otra página, a una web, a un email o a otro Set. */
export const LessonLink = Mark.create({
  name: 'link',
  inclusive: false,
  priority: 1100, // Envuelve a la negrita y la cursiva.
  addAttributes() {
    return {
      target: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-target'),
        renderHTML: (attrs) => ({ 'data-target': attrs.target, title: attrs.target }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'span[data-target]' },
      // Links pegados (Docs, Notion, páginas web): solo web y email; el resto queda como texto.
      {
        tag: 'a[href]',
        getAttrs: (el) => {
          const href = (el as HTMLElement).getAttribute('href') ?? '';
          if (/^mailto:/i.test(href)) return { target: buildTarget('email', href) };
          if (/^https?:\/\//i.test(href)) return { target: buildTarget('web', unwrapRedirect(href)) };
          return false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'lv-link' }, HTMLAttributes), 0];
  },
});

/** Google Docs a veces pega los links como https://www.google.com/url?q=<destino>&…: se usa el destino. */
function unwrapRedirect(href: string): string {
  try {
    const url = new URL(href);
    if (/(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname === '/url' && url.searchParams.get('q')) return url.searchParams.get('q')!;
  } catch {
    // No es una URL válida: se usa tal cual.
  }
  return href;
}
