// Nodos del editor. Solo existe lo que Live muestra (docs/formato.md): párrafos con
// negrita y cursiva, viñetas y la línea divisoria. Lo demás se conserva como "preserved".

import { Extension, InputRule, Mark, Node, mergeAttributes } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import type { MarkType } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
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
      // Nivel de la viñeta: 1, o 2 y 3 para sublistas (docs/formato.md).
      level: {
        default: 1,
        keepOnSplit: true,
        parseHTML: (el) => Math.min(3, Math.max(1, Number(el.getAttribute('data-level')) || 1)),
        renderHTML: (attrs) => (attrs.bullet && attrs.level > 1 ? { 'data-level': String(attrs.level) } : {}),
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
    const attrs = () => this.editor.state.selection.$from.parent.attrs;
    // Sube un nivel; en el nivel 1 saca la viñeta.
    const unbullet = () => {
      const { empty } = this.editor.state.selection;
      if (!empty || !attrs().bullet) return false;
      const level = Number(attrs().level) || 1;
      return this.editor.commands.updateAttributes('paragraph', level > 1 ? { level: level - 1 } : { bullet: false, level: 1 });
    };
    const indent = (delta: number) => {
      if (!attrs().bullet) return false;
      const level = Math.min(3, Math.max(1, (Number(attrs().level) || 1) + delta));
      this.editor.commands.updateAttributes('paragraph', { level });
      return true;
    };
    return {
      // Enter en una viñeta vacía sube de nivel o termina la lista; Backspace al principio igual.
      Enter: () => this.editor.state.selection.$from.parent.content.size === 0 && unbullet(),
      Backspace: () => this.editor.state.selection.$from.parentOffset === 0 && unbullet(),
      // Tab y Shift+Tab en una viñeta cambian el nivel (hasta 3).
      Tab: () => indent(1),
      'Shift-Tab': () => indent(-1),
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
      // Cambia al recortar o reemplazar la imagen, para que el editor la vuelva a dibujar.
      rev: { default: 0, rendered: false },
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

// Live no muestra negrita y cursiva juntas (docs/formato.md): poner una saca la otra.
export const LessonBold = Bold.extend({ excludes: 'italic' });
export const LessonItalic = Italic.extend({ excludes: 'bold' });

/**
 * Live solo marca formato en palabras enteras: el marcador va pegado a un espacio o al borde
 * de la línea. Si se marca media palabra (o la palabra lleva un signo pegado), el formato se
 * extiende a toda la palabra, igual que como va a salir en Live.
 */
export const WholeWords = Extension.create({
  name: 'wholeWords',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(trs, _old, state) {
          if (!trs.some((tr) => tr.docChanged || tr.steps.length)) return null;
          const { bold, italic } = state.schema.marks;
          if (!bold || !italic) return null;
          const tr = state.tr;
          state.doc.descendants((block, blockPos) => {
            if (!block.isTextblock) return true;
            // Cada palabra toma el formato de su primer carácter con formato (como lo escribe la
            // app); lo que no es texto corta la palabra.
            let word: { from: number; to: number; styles: (MarkType | null)[] } | null = null;
            const finish = () => {
              const style = word?.styles.find((st) => st);
              if (word && style && word.styles.some((st) => st !== style)) tr.addMark(word.from, word.to, style.create());
              word = null;
            };
            block.forEach((node, offset) => {
              if (!node.isText) return finish();
              const start = blockPos + 1 + offset;
              // Negrita y cursiva juntas (por ejemplo, pegadas de otro lado): queda la negrita.
              if (node.marks.some((m) => m.type === bold) && node.marks.some((m) => m.type === italic)) {
                tr.removeMark(start, start + node.nodeSize, italic);
              }
              const style = node.marks.some((m) => m.type === bold) ? bold : node.marks.some((m) => m.type === italic) ? italic : null;
              let pos = start;
              for (const ch of node.text!) {
                if (/\s/.test(ch)) finish();
                else {
                  word ??= { from: pos, to: pos, styles: [] };
                  word.to = pos + ch.length;
                  word.styles.push(style);
                }
                pos += ch.length;
              }
            });
            finish();
            return false;
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
