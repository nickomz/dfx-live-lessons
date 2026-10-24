// Diálogo para crear, editar o quitar un link: a otra página, a una web, a un email o a
// otro Set del proyecto. Los destinos se arman con buildTarget (https, mailto, .als).

import type { Editor } from '@tiptap/core';
import type { EditorPage } from '../editor/document';
import { buildTarget, linkKind, type LinkKind } from '../lesson';
import { t } from './strings';

interface LinkOptions {
  editor: Editor;
  getPages: () => EditorPage[];
  current: () => number;
}

const KINDS: { kind: LinkKind; label: string }[] = [
  { kind: 'page', label: t.linkPage },
  { kind: 'web', label: t.linkWeb },
  { kind: 'email', label: t.linkEmail },
  { kind: 'set', label: t.linkSet },
];

export function setupLinks({ editor, getPages, current }: LinkOptions) {
  const dialog = document.createElement('dialog');
  dialog.className = 'dlg';
  dialog.setAttribute('aria-labelledby', 'link-title');
  dialog.innerHTML = `
    <form method="dialog" class="dlg-body">
      <h2 id="link-title">${t.linkTitle}</h2>
      <div class="seg" role="tablist">
        ${KINDS.map((k) => `<button type="button" role="tab" data-kind="${k.kind}">${k.label}</button>`).join('')}
      </div>
      <div data-for="page">
        <label class="field-label" for="link-page">${t.linkPageLabel}</label>
        <div class="field"><select id="link-page"></select></div>
      </div>
      <div data-for="web">
        <label class="field-label" for="link-web">${t.linkWebLabel}</label>
        <div class="field"><input id="link-web" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://www.youtube.com/…"></div>
        <p class="small">${t.linkWebHelp}</p>
      </div>
      <div data-for="email">
        <label class="field-label" for="link-email">${t.linkEmailLabel}</label>
        <div class="field"><input id="link-email" type="email" inputmode="email" autocomplete="off" spellcheck="false" placeholder="nombre@ejemplo.com"></div>
      </div>
      <div data-for="set">
        <label class="field-label" for="link-set">${t.linkSetLabel}</label>
        <div class="field"><input id="link-set" autocomplete="off" spellcheck="false" placeholder="Ejercicio 2"><span>.als</span></div>
        <p class="small">${t.linkSetHelp}</p>
      </div>
      <div class="dlg-actions">
        <button type="button" class="ghost" id="link-remove">${t.linkRemove}</button>
        <button type="button" class="ghost" id="link-cancel">${t.cancel}</button>
        <button type="submit" class="primary wide" id="link-ok">${t.linkApply}</button>
      </div>
    </form>`;
  document.body.append(dialog);

  const q = <T extends HTMLElement>(sel: string) => dialog.querySelector(sel) as T;
  const fields = {
    page: q<HTMLSelectElement>('#link-page'),
    web: q<HTMLInputElement>('#link-web'),
    email: q<HTMLInputElement>('#link-email'),
    set: q<HTMLInputElement>('#link-set'),
  };
  let kind: LinkKind = 'page';

  function value(): string {
    return fields[kind].value.trim();
  }

  function refresh() {
    for (const b of dialog.querySelectorAll<HTMLButtonElement>('[data-kind]')) {
      b.setAttribute('aria-selected', String(b.dataset.kind === kind));
    }
    for (const box of dialog.querySelectorAll<HTMLElement>('[data-for]')) box.hidden = box.dataset.for !== kind;
    const v = value();
    q<HTMLButtonElement>('#link-ok').disabled = !v || (kind === 'email' && !v.includes('@'));
  }

  function select(next: LinkKind) {
    kind = next;
    refresh();
    fields[kind].focus();
  }

  dialog.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach((b) => b.addEventListener('click', () => select(b.dataset.kind as LinkKind)));
  for (const f of Object.values(fields)) f.addEventListener('input', refresh);
  q('#link-cancel').addEventListener('click', () => dialog.close());
  q('#link-remove').addEventListener('click', () => {
    editor.chain().focus().extendMarkRange('link').unsetMark('link').run();
    dialog.close();
  });

  q('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = value();
    if (!v) return;
    const target = buildTarget(kind, v);
    const chain = editor.chain().focus();
    const { empty } = editor.state.selection;
    if (editor.isActive('link')) {
      chain.extendMarkRange('link').setMark('link', { target }).run();
    } else if (empty) {
      // Sin texto seleccionado: se escribe un texto para el link (el título, la dirección, el nombre).
      const label = kind === 'page' ? (getPages().find((p) => p.target === v)?.title ?? v) : v.replace(/^https?:\/\//, '');
      chain.insertContent({ type: 'text', text: label, marks: [{ type: 'link', attrs: { target } }] }).run();
    } else {
      chain.setMark('link', { target }).run();
    }
    dialog.close();
  });

  function openLinkDialog() {
    const existing = String(editor.getAttributes('link').target ?? '');
    const pages = getPages();
    fields.page.replaceChildren(
      ...pages.map((p, i) => {
        const o = document.createElement('option');
        o.value = p.target;
        o.textContent = `${i + 1}. ${p.title || t.untitled}${i === current() ? ' (esta página)' : ''}`;
        return o;
      }),
    );
    for (const f of [fields.web, fields.email, fields.set]) f.value = '';
    kind = linkKind(existing) ?? 'page';
    if (existing) {
      const v = existing.replace(/^(GotoPage:|mailto:|Set:)/, '');
      if (kind === 'page') fields.page.value = v;
      if (kind === 'web') fields.web.value = existing;
      if (kind === 'email') fields.email.value = v;
      if (kind === 'set') fields.set.value = v.replace(/\.als$/i, '');
    } else {
      // Por defecto, la página siguiente.
      fields.page.value = pages[Math.min(current() + 1, pages.length - 1)]?.target ?? '';
    }
    q('#link-remove').hidden = !existing;
    refresh();
    dialog.showModal();
    if (kind !== 'page') fields[kind].focus();
  }

  return { openLinkDialog };
}
