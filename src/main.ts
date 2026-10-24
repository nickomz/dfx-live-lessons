import './styles.css';
import { Editor } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import logoUrl from '../assets/brand/dfx-logo.svg';
import { links } from './app/links';
import { t } from './app/strings';
import { fromLesson, newLesson, newPage, type EditorLesson, type EditorPage } from './editor/document';
import { Divider, LessonParagraph, Preserved, PreservedInline } from './editor/extensions';
import { setupExport } from './app/export';
import { loadDraft, saveDraft } from './app/draft';
import { findLessonFolders, readDropped, readPickedFiles } from './app/open';
import { readLessonFolder } from './lesson';

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
      <article class="lv-panel" aria-label="Lección">
        <div class="lv-head">
          <span class="lv-cell close" aria-hidden="true">${icon.close}</span>
          <input class="lv-title" id="page-title" aria-label="${t.pageTitle}" maxlength="80">
          <button class="lv-cell" id="nav-home" aria-label="Primera página">${icon.home}</button>
          <button class="lv-cell" id="nav-prev" aria-label="Página anterior">${icon.prev}</button>
          <button class="lv-cell" id="nav-next" aria-label="Página siguiente">${icon.next}</button>
        </div>
        <div class="lv-body"><div id="editor"></div></div>
        <div class="lv-foot">
          <button class="lv-pill" id="foot-prev"></button>
          <button class="lv-counter" id="counter" aria-haspopup="dialog" aria-expanded="false"></button>
          <button class="lv-pill next" id="foot-next"></button>
        </div>
      </article>

      <div class="bubble" id="bubble" role="toolbar" aria-label="Formato" hidden>
        <button class="b" id="fmt-bold" aria-label="${t.bold}" aria-pressed="false">B</button>
        <button class="i" id="fmt-italic" aria-label="${t.italic}" aria-pressed="false">I</button>
      </div>
      <button class="inserter" id="inserter" aria-label="${t.insert}" aria-haspopup="menu" aria-expanded="false" hidden>${icon.plus}</button>
      <div class="popover insert-menu" id="insert-menu" role="menu" hidden>
        <button class="menu-item" role="menuitem" id="ins-bullet">${icon.bullet}${t.bullet}</button>
        <button class="menu-item" role="menuitem" id="ins-divider">${icon.divider}${t.divider}</button>
      </div>
      <div class="popover lesson.pages" id="pages-pop" role="dialog" aria-label="${t.pages}" hidden></div>
    </div>
  </main>

  <footer class="foot">
    <a href="${links.website}" target="_blank" rel="noopener">${new URL(links.website).host}</a>
    <a href="${links.donate.es}" target="_blank" rel="noopener">${t.buyCoffee}</a>
    <a href="${links.github}" target="_blank" rel="noopener">GitHub</a>
  </footer>
</div>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Estado: las páginas de la lección y la que se está editando.
let lesson: EditorLesson = newLesson();
let current = 0;

const editor = new Editor({
  element: $('editor'),
  extensions: [
    Document,
    LessonParagraph,
    Text,
    Bold,
    Italic,
    Divider,
    Preserved,
    PreservedInline,
    UndoRedo,
    Placeholder.configure({ placeholder: t.placeholder }),
  ],
  content: lesson.pages[0]!.doc,
  editorProps: { attributes: { class: 'lv-editor', spellcheck: 'true' } },
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

let dragFrom: number | null = null;

function renderPages() {
  const pop = $('pages-pop');
  pop.innerHTML = '';
  lesson.pages.forEach((page, i) => {
    const row = document.createElement('div');
    row.className = `page-row${i === current ? ' current' : ''}`;
    row.draggable = true;
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
    row.addEventListener('dragstart', (e) => {
      dragFrom = i;
      e.dataTransfer?.setData('text/plain', String(i));
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      row.classList.add('drop-before');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drop-before'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragFrom !== null) movePage(dragFrom, i);
      dragFrom = null;
    });
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
const inserter = $('inserter');
const insertMenu = $('insert-menu');

function updateFloating() {
  const wrap = $('panel-wrap').getBoundingClientRect();
  const { selection } = editor.state;
  const focused = editor.isFocused || bubble.contains(document.activeElement) || inserter.contains(document.activeElement);

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
for (const el of [bubble, inserter, insertMenu]) el.addEventListener('mousedown', (e) => e.preventDefault());
$('fmt-bold').addEventListener('click', () => editor.chain().focus().toggleBold().run());
$('fmt-italic').addEventListener('click', () => editor.chain().focus().toggleItalic().run());

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
  loadLesson(newLesson());
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

// --- Abrir una lección y borrador ------------------------------------------------

function changed() {
  saveDraft(() => ({ lesson, current }));
}

function loadLesson(next: EditorLesson, page = 0) {
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

async function openFiles(all: Map<string, Uint8Array>) {
  // Si no hay ninguna lección, no se toca la que está abierta.
  const folders = findLessonFolders(all);
  if (!folders.length) return alert(t.notALesson);
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

for (const [button, inputId] of [['open-zip', 'pick-zip'], ['open-folder', 'pick-folder']] as const) {
  const input = $<HTMLInputElement>(inputId);
  $(button).addEventListener('click', () => {
    closeLessonsMenu();
    input.click();
  });
  input.addEventListener('change', async () => {
    if (input.files?.length) await openFiles(await readPickedFiles(input.files));
    input.value = '';
  });
}

// Soltar una carpeta o un .zip en cualquier parte de la ventana (fuera de los diálogos).
const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
document.addEventListener('dragover', (e) => {
  if (hasFiles(e) && !(e.target as HTMLElement).closest('dialog')) e.preventDefault();
});
document.addEventListener('drop', async (e) => {
  if (!hasFiles(e) || (e.target as HTMLElement).closest('dialog')) return;
  e.preventDefault();
  await openFiles(await readDropped(e.dataTransfer!));
});

const draft = await loadDraft();
if (draft) loadLesson(draft.lesson, draft.current);
else renderPanel();

// En desarrollo, recargar la página entera al cambiar el código (la app arma su HTML al cargar).
import.meta.hot?.accept(() => location.reload());
