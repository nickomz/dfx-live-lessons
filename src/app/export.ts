// Botón Exportar: el resumen de qué se exporta aparece solo al pasar el mouse o con foco.

import type { EditorPage } from '../editor/document';
import { t } from './strings';

interface ExportOptions {
  getPages: () => EditorPage[];
  info: HTMLElement;
  button: HTMLElement;
}

export function setupExport({ info, button }: ExportOptions) {
  let setName = '';

  function updateExportInfo() {
    const zip = `${setName || t.setNamePlaceholder} Lessons.zip`;
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

  updateExportInfo();
  return {
    updateExportInfo,
    setSetName(name: string) {
      setName = name;
      updateExportInfo();
    },
  };
}
