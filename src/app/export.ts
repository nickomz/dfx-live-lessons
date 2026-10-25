// Exportar: el resumen al pasar el mouse, el nombre del set la primera vez, la descarga
// del zip y las instrucciones para llevar la lección a Live.

import { cleanSetName, exportZip, type EditorLesson } from '../editor/document';
import { links } from './links';
import { t } from './strings';

interface ExportOptions {
  getLesson: () => EditorLesson;
  /** Se llama cuando cambia algo de la lección que hay que guardar (el nombre del set). */
  onChange: () => void;
  info: HTMLElement;
  button: HTMLElement;
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function setupExport({ getLesson, onChange, info, button }: ExportOptions) {

  function updateExportInfo() {
    const zip = `${getLesson().setName || t.setNamePlaceholder} Lessons.zip`;
    info.replaceChildren(
      ...t.exportInfo(zip).map((line) => {
        const span = document.createElement('span');
        span.textContent = line;
        return span;
      }),
    );
  }

  const show = () => (info.hidden = false);
  const hide = () => (info.hidden = true);
  button.addEventListener('mouseenter', show);
  button.addEventListener('mouseleave', hide);
  button.addEventListener('focus', show);
  button.addEventListener('blur', hide);

  // --- Nombre del set ---------------------------------------------------------

  const nameDialog = document.createElement('dialog');
  nameDialog.className = 'dlg';
  nameDialog.setAttribute('aria-labelledby', 'set-title');
  nameDialog.innerHTML = `
    <form method="dialog" class="dlg-body">
      <div class="dlg-head">
        <h2 id="set-title">${t.setTitle}</h2>
        <p>${t.setHelp}</p>
      </div>
      <label class="field-label" for="set-name">${t.setLabel}</label>
      <div class="field"><input id="set-name" autocomplete="off" spellcheck="false" placeholder="${t.setExample}"><span>.als</span></div>
      <label class="drop" id="set-drop">
        <input type="file" accept=".als" hidden id="set-file">
        <span>${t.setDrop}</span>
      </label>
      <div class="folder-preview"><span>${t.folderWillBe}</span><code id="set-folder"></code></div>
      <div class="dlg-actions">
        <button type="button" class="ghost" id="set-cancel">${t.cancel}</button>
        <button type="submit" class="primary wide" id="set-ok">${t.download}</button>
      </div>
    </form>`;
  document.body.append(nameDialog);

  const nameInput = nameDialog.querySelector<HTMLInputElement>('#set-name')!;
  const folderPreview = nameDialog.querySelector<HTMLElement>('#set-folder')!;
  const okButton = nameDialog.querySelector<HTMLButtonElement>('#set-ok')!;

  function refreshName() {
    const name = cleanSetName(nameInput.value);
    folderPreview.textContent = `${name || t.setNamePlaceholder} Lessons/`;
    okButton.disabled = !name;
  }
  nameInput.addEventListener('input', refreshName);

  function takeAls(file: File | undefined) {
    if (!file || !/\.als$/i.test(file.name)) return;
    // Solo se usa el nombre del archivo; el contenido no se lee ni se sube.
    nameInput.value = file.name.replace(/\.als$/i, '');
    refreshName();
  }
  const drop = nameDialog.querySelector<HTMLElement>('#set-drop')!;
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    takeAls(e.dataTransfer?.files[0]);
  });
  nameDialog.querySelector<HTMLInputElement>('#set-file')!.addEventListener('change', (e) => {
    takeAls((e.target as HTMLInputElement).files?.[0]);
  });
  nameDialog.querySelector('#set-cancel')!.addEventListener('click', () => nameDialog.close());
  nameDialog.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = cleanSetName(nameInput.value);
    if (!name) return;
    getLesson().setName = name;
    onChange();
    updateExportInfo();
    nameDialog.close();
    void download();
  });

  // --- Después de descargar -----------------------------------------------------

  const doneDialog = document.createElement('dialog');
  doneDialog.className = 'dlg';
  doneDialog.setAttribute('aria-labelledby', 'done-title');
  document.body.append(doneDialog);

  function showDone() {
    const setName = getLesson().setName;
    const folder = escape(`${setName} Lessons`);
    doneDialog.innerHTML = `
      <div class="dlg-body">
        <div class="dlg-head">
          <span class="muted">${t.downloaded}: ${folder}.zip</span>
          <h2 id="done-title">${t.doneTitle}</h2>
        </div>
        <ol class="steps">
          <li><span class="n">1</span><span>${t.step1(folder)}</span></li>
          <li><span class="n">2</span><span>${t.step2}</span></li>
          <li><span class="n">3</span><span>${t.step3}</span></li>
        </ol>
        <pre class="tree">${escape(setName)} Project/
├── ${escape(setName)}.als
└── <b>${folder}/</b></pre>
        <p class="muted small">${t.doneNotes}</p>
        <button class="primary wide" id="done-ok">${t.understood}</button>
        <a class="feedback-link" href="${links.feedback}" target="_blank" rel="noopener">${t.feedbackAfterExport}</a>
      </div>`;
    doneDialog.querySelector('#done-ok')!.addEventListener('click', () => doneDialog.close());
    doneDialog.showModal();
  }

  async function download() {
    const lesson = getLesson();
    // La lección abierta tenía textos distintos por idioma: se exporta el editado en los 7.
    if (lesson.languagesDiffer && !confirm(t.replaceTranslations)) return;
    const setName = lesson.setName;
    const bytes = await exportZip(lesson, setName);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${setName} Lessons.zip`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    showDone();
  }

  button.addEventListener('click', () => {
    hide();
    // Siempre se confirma el nombre, con el último ya escrito: así se puede cambiar y no se
    // exporta con un nombre viejo que no coincide con el .als.
    nameInput.value = getLesson().setName;
    refreshName();
    nameDialog.showModal();
    nameInput.focus();
    nameInput.select();
  });

  updateExportInfo();
  return { updateExportInfo };
}
