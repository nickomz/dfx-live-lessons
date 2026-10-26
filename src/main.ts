import './styles.css';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import logoUrl from '../assets/brand/dfx-logo.svg';
import { links } from './app/links';
import { lang, setLang, t } from './app/strings';
import { fromLesson, newLesson, newPage, type EditorLesson, type EditorPage } from './editor/document';
import {
  Divider,
  LessonBold,
  LessonImage,
  LessonItalic,
  LessonLink,
  LessonParagraph,
  Preserved,
  PreservedInline,
  WholeWords,
} from './editor/extensions';
import { setupLinks } from './app/links-dialog';
import { cleanPastedHTML } from './editor/paste';
import { imageName, ORIGINALS, processImage } from './app/images';
import { setupCrop } from './app/crop';
import { NodeSelection } from '@tiptap/pm/state';
import { setupExport } from './app/export';
import { loadDraft, saveDraft } from './app/draft';
import { dirFromEntry, dirFromFileList, dirFromHandle, dirFromMap, readZip, scanLessons, type Dir, type FileRef, type ScanResult } from './app/open';
import { linkKind, readLessonFolder } from './lesson';

const icon = {
  folder: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M4 20h16"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E6E6E6" stroke-width="3" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  home: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E6E6E6" stroke-width="2.5" aria-hidden="true"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/></svg>',
  prev: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E6E6E6" stroke-width="3" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  next: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E6E6E6" stroke-width="3" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  bullet: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h4m0 0-2-2m2 2-2 2M12 12h8"/></svg>',
  divider: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12h18"/></svg>',
  handle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
  upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 15V4m0 0-4 4m4-4 4 4M4 20h16"/></svg>',
  image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="app">
  <header class="topbar">
    <img class="logo" src="${logoUrl}" alt="DFX Live Lessons">
    <div class="spacer"></div>
    <div class="anchor">
      <button class="icon-btn" id="lessons-btn" aria-label="${t.lessons}" aria-haspopup="menu" aria-expanded="false">${icon.folder}</button>
      <div class="popover right" id="lessons-menu" role="menu" hidden>
        <button class="menu-item" role="menuitem" id="new-lesson">${icon.plus}${t.newLesson}</button>
        <button class="menu-item" role="menuitem" id="open-zip">${icon.upload}${t.openZip}</button>
        <button class="menu-item desktop-only" role="menuitem" id="open-folder">${icon.folder}${t.openFolder}</button>
        <span class="menu-hint desktop-only">${t.dropHint}</span>
        <span class="menu-hint touch-only">${t.dropHintTouch}</span>
        <input type="file" id="pick-zip" accept=".zip,application/zip" hidden>
        <input type="file" id="pick-folder" webkitdirectory hidden>
      </div>
    </div>
    <div class="anchor">
      <button class="primary" id="export-btn" aria-label="${t.export}" aria-describedby="export-info">${icon.download}<span class="export-label">${t.export}</span></button>
      <div class="popover tooltip" id="export-info" role="tooltip" hidden></div>
    </div>
  </header>

  <main class="stage">
    <div class="panel-wrap" id="panel-wrap">
      <article class="lv-panel" aria-label="${t.lesson}">
        <div class="lv-head">
          <span class="lv-cell close" aria-hidden="true">${icon.close}</span>
          <input class="lv-title" id="page-title" aria-label="${t.pageTitle}" maxlength="80">
          <button class="lv-cell" id="nav-home" aria-label="${t.firstPageNav}">${icon.home}</button>
          <button class="lv-cell" id="nav-prev" aria-label="${t.prevPageNav}">${icon.prev}</button>
          <button class="lv-cell" id="nav-next" aria-label="${t.nextPageNav}">${icon.next}</button>
        </div>
        <div class="lv-body"><div id="editor"></div></div>
        <div class="lv-foot">
          <button class="lv-pill" id="foot-prev"></button>
          <button class="lv-counter" id="counter" aria-haspopup="dialog" aria-expanded="false"></button>
          <button class="lv-pill next" id="foot-next"></button>
        </div>
      </article>

      <div class="bubble" id="bubble" role="toolbar" aria-label="${t.format}" hidden>
        <button class="b" id="fmt-bold" aria-label="${t.bold}" aria-pressed="false">B</button>
        <button class="i" id="fmt-italic" aria-label="${t.italic}" aria-pressed="false">I</button>
        <button id="fmt-link" aria-label="${t.link}" aria-pressed="false">${icon.link}</button>
      </div>
      <div class="link-card" id="link-card" role="dialog" aria-label="${t.link}" hidden>
        <span class="link-dest" id="link-dest"></span>
        <div class="link-actions">
          <button id="link-open"></button>
          <button id="link-edit">${t.linkEdit}</button>
          <button id="link-unlink">${t.linkRemove}</button>
        </div>
      </div>
      <div class="link-card image-card" id="image-card" role="dialog" aria-label="${t.image}" hidden>
        <div class="link-actions">
          <button id="img-crop">${t.imageCrop}</button>
          <button id="img-replace">${t.imageReplace}</button>
          <button id="img-remove">${t.imageRemove}</button>
        </div>
        <input type="file" id="pick-replace" accept="image/*" hidden>
      </div>
      <button class="inserter" id="inserter" aria-label="${t.insert}" aria-haspopup="menu" aria-expanded="false" hidden>${icon.plus}</button>
      <div class="popover insert-menu" id="insert-menu" role="menu" hidden>
        <button class="menu-item" role="menuitem" id="ins-bullet">${icon.bullet}${t.bullet}</button>
        <button class="menu-item" role="menuitem" id="ins-image">${icon.image}${t.image}</button>
        <button class="menu-item" role="menuitem" id="ins-divider">${icon.divider}${t.divider}</button>
        <button class="menu-item" role="menuitem" id="ins-link">${icon.link}${t.link}</button>
        <input type="file" id="pick-image" accept="image/*" multiple hidden>
      </div>
      <div class="popover pages" id="pages-pop" role="dialog" aria-label="${t.pages}" hidden></div>
    </div>
    <div class="touch-bar" id="touch-bar" role="toolbar" aria-label="${t.format}" hidden>
      <button id="tb-bold" class="b" aria-label="${t.bold}" aria-pressed="false">B</button>
      <button id="tb-italic" class="i" aria-label="${t.italic}" aria-pressed="false">I</button>
      <button id="tb-link" aria-label="${t.link}" aria-pressed="false">${icon.link}</button>
      <button id="tb-bullet" aria-label="${t.bullet}" aria-pressed="false">${icon.bullet}</button>
      <button id="tb-image" aria-label="${t.image}">${icon.image}</button>
      <button id="tb-divider" aria-label="${t.divider}">${icon.divider}</button>
    </div>
  </main>

  <footer class="foot">
    <div class="lang" role="group" aria-label="${t.language}">
      <button id="lang-es" aria-pressed="${lang === 'es'}">ES</button>
      <span aria-hidden="true">·</span>
      <button id="lang-en" aria-pressed="${lang === 'en'}">EN</button>
    </div>
    <a href="${links.website}" target="_blank" rel="noopener">${new URL(links.website).host}</a>
    <a href="${links.donate[lang]}" target="_blank" rel="noopener">${t.donate}</a>
    <a href="${links.github}" target="_blank" rel="noopener">GitHub</a>
    <a href="${links.feedback}" target="_blank" rel="noopener">${t.feedback}</a>
  </footer>
</div>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Estado: las páginas de la lección y la que se está editando.
let lesson: EditorLesson = newLesson(t.firstPage);
let current = 0;

const editor = new Editor({
  element: $('editor'),
  extensions: [
    Document,
    LessonParagraph,
    Text,
    LessonBold,
    LessonItalic,
    WholeWords,
    Divider,
    Preserved,
    LessonImage.configure({ resolve: (file) => imageUrl(file) }),
    LessonLink,
    PreservedInline,
    UndoRedo,
    Placeholder.configure({ placeholder: t.placeholder }),
  ],
  content: lesson.pages[0]!.doc,
  editorProps: {
    attributes: { class: 'lv-editor', spellcheck: 'true' },
    // Lo pegado desde Docs, Notion o la web se lleva a lo que Live muestra.
    transformPastedHTML: (html) => cleanPastedHTML(html),
    // Pegar una captura (Cmd+V) o soltar imágenes en el panel las agrega a la lección.
    handlePaste: (_view, event) => {
      const images = imageFiles(event.clipboardData?.files);
      if (!images.length) return false;
      void addImages(images);
      return true;
    },
    // Cmd+clic (Mac) o Ctrl+clic (Windows) sobre un link lo abre directo.
    handleClick: (view, pos, event) => {
      if (!event.metaKey && !event.ctrlKey) return false;
      const mark = view.state.doc.resolve(pos).marks().find((m) => m.type.name === 'link');
      if (!mark) return false;
      openLink(String(mark.attrs.target));
      return true;
    },
    handleDrop: (view, event) => {
      const images = imageFiles(event.dataTransfer?.files);
      if (!images.length) return false;
      event.preventDefault();
      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
      void addImages(images, pos);
      return true;
    },
  },
  onUpdate: () => {
    lesson.pages[current]!.doc = editor.getJSON();
    changed();
  },
  onSelectionUpdate: () => updateFloating(),
  onBlur: () => setTimeout(updateFloating, 0),
  onFocus: () => updateFloating(),
});

// Un clic en el espacio vacío del panel lleva el cursor al final del texto.
document.querySelector('.lv-body')!.addEventListener('mousedown', (e) => {
  if ((e.target as HTMLElement).closest('.lv-editor')) return;
  e.preventDefault();
  editor.commands.focus('end');
});

// --- Páginas -----------------------------------------------------------------

const titleInput = $<HTMLInputElement>('page-title');
titleInput.addEventListener('input', () => {
  lesson.pages[current]!.title = titleInput.value;
  changed();
  if (!$('pages-pop').hidden) renderPages();
});
titleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    editor.commands.focus('start');
  }
});

function goTo(index: number) {
  if (index < 0 || index >= lesson.pages.length) return;
  lesson.pages[current]!.doc = editor.getJSON();
  current = index;
  editor.commands.setContent(lesson.pages[current]!.doc, { emitUpdate: false });
  renderPanel();
}

function renderPanel() {
  const last = lesson.pages.length - 1;
  titleInput.value = lesson.pages[current]!.title;
  $('counter').textContent = `${current + 1} / ${lesson.pages.length}`;
  const footPrev = $<HTMLButtonElement>('foot-prev');
  footPrev.textContent = current === 0 ? 'Return' : 'Previous Page';
  footPrev.disabled = current === 0;
  const footNext = $<HTMLButtonElement>('foot-next');
  footNext.textContent = current === last ? 'Finish' : 'Next Page';
  footNext.disabled = current === last;
  $<HTMLButtonElement>('nav-prev').disabled = current === 0;
  $<HTMLButtonElement>('nav-next').disabled = current === last;
  if (!$('pages-pop').hidden) renderPages();
  updateExportInfo();
  changed();
}

$('nav-home').addEventListener('click', () => goTo(0));
$('nav-prev').addEventListener('click', () => goTo(current - 1));
$('nav-next').addEventListener('click', () => goTo(current + 1));
$('foot-prev').addEventListener('click', () => goTo(current - 1));
$('foot-next').addEventListener('click', () => goTo(current + 1));

const hasContent = (p: EditorPage) => JSON.stringify(p.doc.content ?? []).includes('"text"') || JSON.stringify(p.doc.content ?? []).includes('divider');

function renderPages() {
  const pop = $('pages-pop');
  pop.innerHTML = '';
  lesson.pages.forEach((page, i) => {
    const row = document.createElement('div');
    row.className = `page-row${i === current ? ' current' : ''}`;
    row.innerHTML = `<span class="handle">${icon.handle}</span><span class="num">${i + 1}</span>`;
    const go = document.createElement('button');
    go.className = 'go';
    go.textContent = page.title || t.untitled;
    go.addEventListener('click', () => {
      goTo(i);
      closePages();
    });
    const del = document.createElement('button');
    del.className = 'del';
    del.setAttribute('aria-label', `${t.deletePage} ${i + 1}`);
    del.innerHTML = icon.trash;
    del.disabled = lesson.pages.length === 1;
    del.addEventListener('click', () => deletePage(i));
    row.append(go, del);
    // Reordenar: se agarra la manija (con el mouse o con el dedo) y se suelta sobre otra fila.
    row.querySelector('.handle')!.addEventListener('pointerdown', (e) => startRowDrag(e as PointerEvent, i));
    pop.append(row);
  });
  const add = document.createElement('button');
  add.className = 'menu-item add';
  add.innerHTML = `${icon.plus}${t.newPage}`;
  add.addEventListener('click', () => {
    lesson.pages[current]!.doc = editor.getJSON();
    lesson.pages.push(newPage(lesson.pages, t.untitled));
    goTo(lesson.pages.length - 1);
    closePages();
    titleInput.select();
  });
  pop.append(add);
}

function startRowDrag(e: PointerEvent, from: number) {
  e.preventDefault();
  const rows = [...$('pages-pop').querySelectorAll<HTMLElement>('.page-row')];
  rows[from]!.classList.add('dragging');
  let to = from;
  const move = (ev: PointerEvent) => {
    const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.page-row');
    const i = over ? rows.indexOf(over) : -1;
    if (i < 0) return;
    to = i;
    rows.forEach((r, j) => r.classList.toggle('drop-before', j === to && to !== from));
  };
  const end = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
    movePage(from, to);
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

function movePage(from: number, to: number) {
  if (from === to) return renderPages();
  lesson.pages[current]!.doc = editor.getJSON();
  const editing = lesson.pages[current]!;
  const [moved] = lesson.pages.splice(from, 1);
  lesson.pages.splice(to, 0, moved!);
  current = lesson.pages.indexOf(editing);
  renderPanel();
}

function deletePage(i: number) {
  if (lesson.pages.length === 1) return;
  lesson.pages[current]!.doc = editor.getJSON();
  if (hasContent(lesson.pages[i]!) && !confirm(t.deletePageConfirm)) return;
  const editing = lesson.pages[current]!;
  lesson.pages.splice(i, 1);
  current = lesson.pages.includes(editing) ? lesson.pages.indexOf(editing) : Math.min(i, lesson.pages.length - 1);
  editor.commands.setContent(lesson.pages[current]!.doc, { emitUpdate: false });
  renderPanel();
}

function closePages() {
  $('pages-pop').hidden = true;
  $('counter').setAttribute('aria-expanded', 'false');
}

$('counter').addEventListener('click', () => {
  const pop = $('pages-pop');
  if (!pop.hidden) return closePages();
  renderPages();
  pop.hidden = false;
  $('counter').setAttribute('aria-expanded', 'true');
});

// --- Formato: barrita al seleccionar y "+" en una línea vacía -------------------

const bubble = $('bubble');
const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
const inserter = $('inserter');
const insertMenu = $('insert-menu');

function updateFloating() {
  const wrap = $('panel-wrap').getBoundingClientRect();
  const { selection } = editor.state;
  const focused = editor.isFocused || bubble.contains(document.activeElement) || inserter.contains(document.activeElement);

  // Con el cursor dentro de un link (sin seleccionar) aparece la tarjeta del link.
  const linkCard = $('link-card');
  const cardFocused = linkCard.contains(document.activeElement);
  if ((editor.isFocused || cardFocused) && selection.empty && editor.isActive('link')) {
    showLinkCard(wrap);
  } else if (!cardFocused) {
    linkCard.hidden = true;
  }

  // Con una imagen seleccionada aparece su tarjeta: recortar, reemplazar, quitar.
  const imageCard = $('image-card');
  const imageCardFocused = imageCard.contains(document.activeElement);
  const image = selectedImage();
  if ((editor.isFocused || imageCardFocused) && image) {
    const box = (editor.view.nodeDOM(image.pos) as HTMLElement).getBoundingClientRect();
    imageCard.hidden = false;
    imageCard.style.left = `${Math.max(box.left - wrap.left, 0)}px`;
    imageCard.style.top = `${box.bottom - wrap.top + 6}px`;
  } else if (!imageCardFocused) {
    imageCard.hidden = true;
  }

  // En pantallas táctiles el formato va en la barra de arriba del teclado.
  if (isTouch) {
    bubble.hidden = true;
    inserter.hidden = true;
    updateTouchBar();
    return;
  }

  // La barrita aparece con texto seleccionado.
  if (focused && !selection.empty && selection.$from.parent.type.name === 'paragraph') {
    const start = editor.view.coordsAtPos(selection.from);
    const end = editor.view.coordsAtPos(selection.to);
    bubble.hidden = false;
    const left = Math.min(Math.max(start.left - wrap.left - 10, 0), wrap.width - bubble.offsetWidth);
    bubble.style.left = `${left}px`;
    // Arriba de la selección; si taparía la cabecera del panel, abajo.
    const above = start.top - wrap.top - 48;
    bubble.style.top = `${above < 34 ? end.bottom - wrap.top + 8 : above}px`;
    $('fmt-bold').setAttribute('aria-pressed', String(editor.isActive('bold')));
    $('fmt-italic').setAttribute('aria-pressed', String(editor.isActive('italic')));
    $('fmt-link').setAttribute('aria-pressed', String(editor.isActive('link')));
  } else {
    bubble.hidden = true;
  }

  const $from = selection.$from;
  const emptyLine = selection.empty && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0;
  if ((editor.isFocused || !insertMenu.hidden) && emptyLine) {
    const pos = editor.view.coordsAtPos(selection.from);
    inserter.hidden = false;
    inserter.style.top = `${pos.top - wrap.top - 8}px`;
    insertMenu.style.top = `${pos.top - wrap.top + 30}px`;
  } else if (insertMenu.hidden) {
    inserter.hidden = true;
  }
}

// mousedown + preventDefault: el editor no pierde la selección al tocar la barrita.
for (const el of [bubble, inserter, insertMenu, $('link-card'), $('image-card')]) el.addEventListener('mousedown', (e) => e.preventDefault());

// --- Celular: barra de formato pegada arriba del teclado ---------------------------

const touchBar = $('touch-bar');
// pointerdown + preventDefault: el editor no pierde el foco y el teclado no se cierra.
touchBar.addEventListener('pointerdown', (e) => e.preventDefault());
// Después de cada botón se actualiza qué está activo (B sin selección no mueve el cursor).
touchBar.addEventListener('click', () => setTimeout(updateTouchBar, 0));

function updateTouchBar() {
  touchBar.hidden = !editor.isFocused;
  if (touchBar.hidden) return;
  // La barra va al pie de la parte visible de la pantalla, justo arriba del teclado. En el
  // iPhone el teclado no achica la página (solo visualViewport): con "bottom: 0" la barra
  // quedaba detrás del teclado, al final de la página.
  const vv = window.visualViewport;
  touchBar.style.top = vv ? `${vv.offsetTop + vv.height}px` : '';
  $('tb-bold').setAttribute('aria-pressed', String(editor.isActive('bold')));
  $('tb-italic').setAttribute('aria-pressed', String(editor.isActive('italic')));
  $('tb-link').setAttribute('aria-pressed', String(editor.isActive('link')));
  $('tb-bullet').setAttribute('aria-pressed', String(!!editor.state.selection.$from.parent.attrs.bullet));
}
if (isTouch) {
  window.visualViewport?.addEventListener('resize', updateTouchBar);
  window.visualViewport?.addEventListener('scroll', updateTouchBar);
}
$('tb-bold').addEventListener('click', () => editor.chain().focus().toggleBold().run());
$('tb-italic').addEventListener('click', () => editor.chain().focus().toggleItalic().run());
$('tb-link').addEventListener('click', () => openLinkDialog());
$('tb-bullet').addEventListener('click', () => {
  const bullet = !!editor.state.selection.$from.parent.attrs.bullet;
  editor.chain().focus().updateAttributes('paragraph', { bullet: !bullet }).run();
});
$('tb-image').addEventListener('click', () => $<HTMLInputElement>('pick-image').click());
$('tb-divider').addEventListener('click', () => editor.chain().focus().insertContent([{ type: 'divider' }, { type: 'paragraph' }]).run());

/** Lo que hace "Abrir" según el tipo de link. */
function linkInfo(target: string): { label: string; open?: string; dest: string } {
  const kind = linkKind(target);
  if (kind === 'page') {
    const page = lesson.pages.find((p) => p.target === target.slice('GotoPage:'.length));
    return { dest: `${t.linkPage}: ${page?.title || t.untitled}`, label: t.linkGoToPage, open: target };
  }
  if (kind === 'web') return { dest: target.replace(/^https?:\/\//, '').replace(/\/$/, ''), label: t.linkOpen, open: target };
  if (kind === 'email') return { dest: target.replace(/^mailto:/, ''), label: t.linkOpen, open: target };
  if (kind === 'set') return { dest: `${t.linkSet}: ${target.replace(/^Set:/, '')}` , label: '' };
  return { dest: target, label: '' };
}

function openLink(target: string) {
  const kind = linkKind(target);
  if (kind === 'page') {
    const i = lesson.pages.findIndex((p) => p.target === target.slice('GotoPage:'.length));
    if (i >= 0) goTo(i);
  } else if (kind === 'web' || kind === 'email') {
    window.open(target, '_blank', 'noopener');
  }
  // Un link a otro Set solo funciona dentro de Live.
}

function showLinkCard(wrap: DOMRect) {
  const card = $('link-card');
  const target = String(editor.getAttributes('link').target ?? '');
  const info = linkInfo(target);
  $('link-dest').textContent = info.dest;
  $('link-dest').title = target;
  const open = $<HTMLButtonElement>('link-open');
  open.hidden = !info.open;
  open.textContent = info.label;
  card.hidden = false;
  const pos = editor.view.coordsAtPos(editor.state.selection.from);
  const left = Math.min(Math.max(pos.left - wrap.left - 20, 0), wrap.width - card.offsetWidth);
  card.style.left = `${Math.max(left, 0)}px`;
  card.style.top = `${pos.bottom - wrap.top + 6}px`;
}

$('link-open').addEventListener('click', () => openLink(String(editor.getAttributes('link').target ?? '')));
$('link-edit').addEventListener('click', () => {
  $('link-card').hidden = true;
  openLinkDialog();
});
$('link-unlink').addEventListener('click', () => {
  editor.chain().focus().extendMarkRange('link').unsetMark('link').run();
  $('link-card').hidden = true;
});
$('fmt-bold').addEventListener('click', () => editor.chain().focus().toggleBold().run());
$('fmt-italic').addEventListener('click', () => editor.chain().focus().toggleItalic().run());
const { openLinkDialog } = setupLinks({ editor, getPages: () => lesson.pages, current: () => current });
$('fmt-link').addEventListener('click', () => openLinkDialog());
$('ins-link').addEventListener('click', () => {
  closeInsert();
  openLinkDialog();
});

inserter.addEventListener('click', () => {
  insertMenu.hidden = !insertMenu.hidden;
  inserter.setAttribute('aria-expanded', String(!insertMenu.hidden));
});
function closeInsert() {
  insertMenu.hidden = true;
  inserter.setAttribute('aria-expanded', 'false');
}
$('ins-bullet').addEventListener('click', () => {
  editor.chain().focus().updateAttributes('paragraph', { bullet: true }).run();
  closeInsert();
  updateFloating();
});
const pickImage = $<HTMLInputElement>('pick-image');
$('ins-image').addEventListener('click', () => {
  closeInsert();
  pickImage.click();
});
pickImage.addEventListener('change', () => {
  const images = imageFiles(pickImage.files ?? undefined);
  pickImage.value = '';
  if (images.length) void addImages(images);
});

$('ins-divider').addEventListener('click', () => {
  editor.chain().focus().insertContent([{ type: 'divider' }, { type: 'paragraph' }]).run();
  closeInsert();
  updateFloating();
});

// --- Menú de lecciones -----------------------------------------------------------

const lessonsBtn = $('lessons-btn');
const lessonsMenu = $('lessons-menu');
lessonsBtn.addEventListener('click', () => {
  lessonsMenu.hidden = !lessonsMenu.hidden;
  lessonsBtn.setAttribute('aria-expanded', String(!lessonsMenu.hidden));
});
$('new-lesson').addEventListener('click', () => {
  lessonsMenu.hidden = true;
  lessonsBtn.setAttribute('aria-expanded', 'false');
  if (lesson.pages.some(hasContent) && !confirm(t.newLessonConfirm)) return;
  loadLesson(newLesson(t.firstPage));
});

// Cerrar menús al hacer clic afuera o con Escape.
document.addEventListener('mousedown', (e) => {
  const target = e.target as Node;
  if (!lessonsMenu.hidden && !lessonsMenu.contains(target) && !lessonsBtn.contains(target)) {
    lessonsMenu.hidden = true;
    lessonsBtn.setAttribute('aria-expanded', 'false');
  }
  if (!$('pages-pop').hidden && !$('pages-pop').contains(target) && !$('counter').contains(target)) closePages();
  if (!insertMenu.hidden && !insertMenu.contains(target) && !inserter.contains(target)) closeInsert();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  lessonsMenu.hidden = true;
  closePages();
  closeInsert();
});

// --- Exportar ------------------------------------------------------------------

const { updateExportInfo } = setupExport({ getLesson: () => lesson, onChange: () => changed(), info: $('export-info'), button: $('export-btn') });

// --- Imágenes ---------------------------------------------------------------------

const imageUrls = new Map<string, string>();

/** URL para mostrar una imagen de la lección; usa la copia de Large/ si está (más nítida). */
function imageUrl(file: string): string | null {
  const cached = imageUrls.get(file);
  if (cached) return cached;
  const bytes = lesson.assets.get(`Large/${file}`) ?? lesson.assets.get(file);
  if (!bytes) return null;
  const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
  imageUrls.set(file, url);
  return url;
}

function clearImageUrls() {
  for (const url of imageUrls.values()) URL.revokeObjectURL(url);
  imageUrls.clear();
}

const imageFiles = (list?: FileList) => [...(list ?? [])].filter((f) => f.type.startsWith('image/'));

/** La imagen seleccionada en el editor, si hay una. */
function selectedImage(): { pos: number; file: string } | null {
  const sel = editor.state.selection;
  return sel instanceof NodeSelection && sel.node.type.name === 'image' ? { pos: sel.from, file: String(sel.node.attrs.file) } : null;
}

/** Guarda las versiones para Live de una imagen y la vuelve a dibujar donde aparezca. */
function storeImage(name: string, processed: { small: Uint8Array; large?: Uint8Array }) {
  lesson.assets.set(name, processed.small);
  if (processed.large) lesson.assets.set(`Large/${name}`, processed.large);
  else lesson.assets.delete(`Large/${name}`);
  const url = imageUrls.get(name);
  if (url) URL.revokeObjectURL(url);
  imageUrls.delete(name);
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' && node.attrs.file === name) tr.setNodeMarkup(pos, undefined, { ...node.attrs, rev: Number(node.attrs.rev) + 1 });
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

/** La mejor versión que hay de una imagen para recortarla: la original, o la copia grande. */
const bestImage = (name: string) => lesson.assets.get(`${ORIGINALS}${name}`) ?? lesson.assets.get(`Large/${name}`) ?? lesson.assets.get(name);

const { openCrop } = setupCrop();

/**
 * Abre la ventana de ajuste para una imagen que se está agregando y devuelve sus versiones
 * para Live: tal cual ("Usar así") o recortada.
 */
async function adjustNewImage(file: File, bytes: Uint8Array) {
  const result = await openCrop(bytes, { insert: true });
  return result?.kind === 'crop' ? processImage(result.blob, { fit: result.fit }) : processImage(file);
}

$('img-crop').addEventListener('click', async () => {
  const image = selectedImage();
  const bytes = image && bestImage(image.file);
  if (!image || !bytes) return;
  const result = await openCrop(bytes);
  if (result?.kind !== 'crop') return;
  storeImage(image.file, await processImage(result.blob, { fit: result.fit }));
  changed();
});
const pickReplace = $<HTMLInputElement>('pick-replace');
$('img-replace').addEventListener('click', () => pickReplace.click());
pickReplace.addEventListener('change', async () => {
  const file = imageFiles(pickReplace.files ?? undefined)[0];
  pickReplace.value = '';
  const image = selectedImage();
  if (!file || !image) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let processed;
  try {
    processed = await adjustNewImage(file, bytes);
  } catch {
    return alert(t.imageError);
  }
  lesson.assets.set(`${ORIGINALS}${image.file}`, bytes);
  storeImage(image.file, processed);
  changed();
});
$('img-remove').addEventListener('click', () => {
  editor.chain().focus().deleteSelection().run();
  $('image-card').hidden = true;
});

/** Convierte las imágenes para Live, las guarda en la lección y las inserta en el texto. */
async function addImages(files: File[], pos?: number) {
  const nodes = [];
  // Una ventana de ajuste por imagen, en orden.
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let processed;
    try {
      processed = await adjustNewImage(file, bytes);
    } catch {
      alert(t.imageError);
      continue;
    }
    const used = new Set([...lesson.assets.keys()].filter((k) => !k.startsWith('Large/') && !k.startsWith(ORIGINALS)));
    const name = imageName(file.name, used);
    lesson.assets.set(name, processed.small);
    if (processed.large) lesson.assets.set(`Large/${name}`, processed.large);
    lesson.assets.set(`${ORIGINALS}${name}`, bytes);
    nodes.push({ type: 'image', attrs: { file: name } });
  }
  if (!nodes.length) return;
  const chain = editor.chain().focus();
  if (pos !== undefined) chain.insertContentAt(pos, [...nodes, { type: 'paragraph' }]).run();
  else chain.insertContent([...nodes, { type: 'paragraph' }]).run();
  changed();
}

// --- Abrir una lección y borrador ------------------------------------------------

function changed() {
  saveDraft(() => ({ lesson, current }));
}

function loadLesson(next: EditorLesson, page = 0) {
  clearImageUrls();
  lesson = next;
  current = Math.min(page, lesson.pages.length - 1);
  editor.commands.setContent(lesson.pages[current]!.doc, { emitUpdate: false });
  renderPanel();
}

function closeLessonsMenu() {
  lessonsMenu.hidden = true;
  lessonsBtn.setAttribute('aria-expanded', 'false');
}

/** Diálogo para elegir una opción de una lista. Devuelve el valor elegido o null. */
function choose(title: string, help: string, options: { value: string; label: string; detail: string }[]): Promise<string | null> {
  const dialog = document.createElement('dialog');
  dialog.className = 'dlg';
  dialog.innerHTML = `<div class="dlg-body"><div class="dlg-head"><h2></h2><p></p></div><div class="lang-list"></div><button class="ghost" value="">${t.cancel}</button></div>`;
  dialog.querySelector('h2')!.textContent = title;
  dialog.querySelector('p')!.textContent = help;
  const list = dialog.querySelector('.lang-list')!;
  for (const o of options) {
    const b = document.createElement('button');
    b.className = 'menu-item lang';
    b.value = o.value;
    b.innerHTML = '<b></b><span></span>';
    b.querySelector('b')!.textContent = o.label;
    b.querySelector('span')!.textContent = o.detail;
    list.append(b);
  }
  document.body.append(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      dialog.close();
      dialog.remove();
      resolve(b.value || null);
    });
    dialog.addEventListener('cancel', () => {
      dialog.remove();
      resolve(null);
    });
    dialog.showModal();
  });
}

/** Abre lo que encontró la búsqueda. Si no hay lección, avisa y no toca la que está abierta. */
async function openFound(result: ScanResult, fromFolder: boolean) {
  if (result === 'too-many' || !result.length) return alert(fromFolder ? t.notALessonFolder : t.notALesson);
  const folders = result;
  let folder = folders[0]!;
  if (folders.length > 1) {
    // Por ejemplo, la carpeta de un proyecto con una lección por cada .als.
    const pick = await choose(
      t.whichLessonTitle,
      t.whichLessonHelp,
      folders.map((f, i) => ({ value: String(i), label: f.setName || t.untitledSet, detail: f.path })),
    );
    if (pick === null) return;
    folder = folders[Number(pick)]!;
  }
  const read = readLessonFolder(folder.files);
  const keys = [...read.lessons.keys()];
  let key: string | null | undefined = ['LessonsES.txt', 'LessonsEN.txt'].find((k) => read.lessons.has(k)) ?? keys[0];
  if (read.languagesDiffer) {
    key = await choose(
      t.languagesDifferTitle,
      t.languagesDifferHelp,
      [...read.lessons].map(([file, l]) => ({ value: file, label: file.replace(/^Lessons|\.txt$/g, ''), detail: l.pages[0]?.title ?? '' })),
    );
  }
  if (!key) return;
  if (lesson.pages.some(hasContent) && !confirm(t.newLessonConfirm)) return;
  loadLesson(fromLesson(read.lessons.get(key)!, { assets: read.assets, languagesDiffer: read.languagesDiffer, setName: folder.setName }));
}

const openZip = async (bytes: Uint8Array) => openFound(await scanLessons(dirFromMap(await readZip(bytes))), false);

const pickZip = $<HTMLInputElement>('pick-zip');
$('open-zip').addEventListener('click', () => {
  closeLessonsMenu();
  pickZip.click();
});
pickZip.addEventListener('change', async () => {
  const file = pickZip.files?.[0];
  pickZip.value = '';
  if (file) await openZip(new Uint8Array(await file.arrayBuffer()));
});

// Chrome y Edge: showDirectoryPicker, que recorre de a poco y no pide "subir" archivos.
// Safari y Firefox: <input webkitdirectory>, del que solo se miran los nombres.
const pickFolder = $<HTMLInputElement>('pick-folder');
$('open-folder').addEventListener('click', async () => {
  closeLessonsMenu();
  const picker = (window as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
  if (!picker) return pickFolder.click();
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await picker();
  } catch {
    return; // Canceló.
  }
  await openFound(await scanLessons(dirFromHandle(handle)), true);
});
pickFolder.addEventListener('change', async () => {
  const files = [...(pickFolder.files ?? [])];
  pickFolder.value = '';
  if (files.length) await openFound(await scanLessons(dirFromFileList(files)), true);
});

// Soltar una carpeta o un .zip en cualquier parte de la ventana (fuera de los diálogos).
const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
document.addEventListener('dragover', (e) => {
  if (hasFiles(e) && !(e.target as HTMLElement).closest('dialog')) e.preventDefault();
});
document.addEventListener('drop', async (e) => {
  // Las imágenes soltadas sobre el editor ya las agregó el editor.
  if (e.defaultPrevented || !hasFiles(e) || (e.target as HTMLElement).closest('dialog')) return;
  e.preventDefault();
  const entries = [...e.dataTransfer!.items].map((i) => i.webkitGetAsEntry?.()).filter((x): x is FileSystemEntry => !!x);
  const files = [...e.dataTransfer!.files];
  if (entries.length === 1 && entries[0]!.isFile && /\.zip$/i.test(entries[0]!.name)) {
    return openZip(new Uint8Array(await files[0]!.arrayBuffer()));
  }
  if (entries.length === 1 && entries[0]!.isDirectory) {
    return openFound(await scanLessons(dirFromEntry(entries[0] as FileSystemDirectoryEntry)), true);
  }
  // Varios archivos o carpetas sueltos: se buscan como si estuvieran en una carpeta.
  const loose: Dir = {
    name: '',
    list: async () =>
      entries.map((en, i): Dir | FileRef =>
        en.isDirectory ? dirFromEntry(en as FileSystemDirectoryEntry) : { name: en.name, read: async () => new Uint8Array(await files[i]!.arrayBuffer()) },
      ),
  };
  await openFound(await scanLessons(loose), entries.some((en) => en.isDirectory));
});

const draft = await loadDraft();
if (draft) loadLesson(draft.lesson, draft.current);
else renderPanel();

document.documentElement.lang = lang;
$('lang-es').addEventListener('click', () => setLang('es'));
$('lang-en').addEventListener('click', () => setLang('en'));

// En desarrollo, recargar la página entera al cambiar el código (la app arma su HTML al cargar).
import.meta.hot?.accept(() => location.reload());
