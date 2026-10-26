// Ventana para ajustar una imagen. Live dibuja las imágenes a 260 px de ancho sin adaptarlas
// al panel, así que una captura de pantalla entera no se lee: el docente elige la parte que
// importa y ve al lado cómo va a quedar. Se abre al insertar cada imagen (con la imagen entera
// elegida: "Usar así" la deja como está) y desde la tarjeta de la imagen para volver a
// recortarla. Cropper.js se carga recién al abrir la ventana.

import 'cropperjs/dist/cropper.css';
import type Cropper from 'cropperjs';
import { WIDTH } from './images';
import { t } from './strings';

/** Lo que eligió el docente: la imagen sin cambios, un recorte, o nada (canceló). */
export type CropResult = { kind: 'asIs' } | { kind: 'crop'; blob: Blob; fit: boolean } | null;

export function setupCrop() {
  const dialog = document.createElement('dialog');
  dialog.className = 'dlg crop-dlg';
  dialog.setAttribute('aria-labelledby', 'crop-title');
  dialog.innerHTML = `
    <form method="dialog" class="dlg-body">
      <div class="dlg-head">
        <h2 id="crop-title">${t.cropTitle}</h2>
        <p>${t.cropHelp}</p>
      </div>
      <div class="crop-area"><img id="crop-img" alt=""></div>
      <div class="crop-preview">
        <span class="field-label">${t.cropPreview}</span>
        <div class="crop-panel"><canvas id="crop-canvas"></canvas></div>
      </div>
      <div id="crop-fit-box" hidden>
        <label class="check"><input type="checkbox" id="crop-fit"> ${t.cropFit}</label>
        <p class="small" id="crop-fit-note" hidden>${t.cropFitNote}</p>
      </div>
      <div class="dlg-actions">
        <button type="button" class="ghost" id="crop-cancel">${t.cancel}</button>
        <button type="submit" class="primary wide" id="crop-ok">${t.linkApply}</button>
      </div>
    </form>`;
  document.body.append(dialog);

  const q = <T extends HTMLElement>(sel: string) => dialog.querySelector(sel) as T;
  const img = q<HTMLImageElement>('#crop-img');
  const canvas = q<HTMLCanvasElement>('#crop-canvas');
  const fitBox = q('#crop-fit-box');
  const fit = q<HTMLInputElement>('#crop-fit');
  const ok = q<HTMLButtonElement>('#crop-ok');
  const cancel = q<HTMLButtonElement>('#crop-cancel');
  let cropper: Cropper | null = null;
  let url = '';
  let frame = 0;
  let inserting = false;
  let finish: (result: CropResult) => void = () => {};

  /** La imagen entera, sin agrandar: no hay nada que procesar distinto. */
  function untouched(): boolean {
    if (!cropper) return true;
    const d = cropper.getData(true);
    const whole = d.x <= 0 && d.y <= 0 && d.width >= img.naturalWidth - 1 && d.height >= img.naturalHeight - 1;
    return whole && !(fit.checked && !fitBox.hidden);
  }

  /** Dibuja la parte elegida al tamaño en que la muestra Live (nítida en pantallas Retina). */
  function preview() {
    if (!cropper) return;
    const data = cropper.getData(true);
    const small = data.width < WIDTH;
    fitBox.hidden = !small;
    q('#crop-fit-note').hidden = !(small && fit.checked);
    const width = small && !fit.checked ? data.width : WIDTH;
    const height = Math.max(1, Math.round((data.height * width) / Math.max(1, data.width)));
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, data.x, data.y, data.width, data.height, 0, 0, canvas.width, canvas.height);
    // Al insertar, mientras no se toque nada, el único botón es "Usar así"; si se recorta,
    // quedan "Usar así" (sin cambios) y "Aplicar".
    const asIs = inserting && untouched();
    ok.textContent = asIs ? t.cropUseAsIs : t.linkApply;
    cancel.hidden = asIs;
  }
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(preview);
  };
  fit.addEventListener('change', preview);

  function close(result: CropResult) {
    cancelAnimationFrame(frame);
    cropper?.destroy();
    cropper = null;
    if (url) URL.revokeObjectURL(url);
    url = '';
    dialog.close();
    finish(result);
  }
  // Al insertar, Esc y el botón de al lado dejan la imagen como está; al recortar, cancelan.
  const dismiss = () => close(inserting ? { kind: 'asIs' } : null);
  cancel.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    dismiss();
  });

  // Enter en cualquier parte de la ventana (salvo sobre otro botón) es el botón principal.
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || (e.target as HTMLElement).closest('button, input')) return;
    e.preventDefault();
    q<HTMLFormElement>('form').requestSubmit();
  });

  // Enter o el botón principal: "Usar así" si no se tocó nada, si no el recorte.
  q('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!cropper) return;
    if (inserting && untouched()) return close({ kind: 'asIs' });
    ok.disabled = true;
    try {
      const blob = await new Promise<Blob | null>((r) => cropper!.getCroppedCanvas({ imageSmoothingQuality: 'high' }).toBlob(r, 'image/png'));
      close(blob ? { kind: 'crop', blob, fit: !fitBox.hidden && fit.checked } : null);
    } finally {
      ok.disabled = false;
    }
  });

  /**
   * Abre la ventana con la imagen (la original o la mejor copia que haya). `insert`: la imagen
   * se está agregando y cerrar la ventana la deja como está.
   */
  async function openCrop(bytes: Uint8Array, { insert = false } = {}): Promise<CropResult> {
    const { default: CropperJS } = await import('cropperjs');
    inserting = insert;
    cancel.textContent = insert ? t.cropUseAsIs : t.cancel;
    cancel.hidden = insert;
    url = URL.createObjectURL(new Blob([bytes as BlobPart]));
    fit.checked = false;
    fitBox.hidden = true;
    img.src = url;
    const result = new Promise<CropResult>((resolve) => (finish = resolve));
    dialog.showModal();
    await img.decode();
    cropper = new CropperJS(img, {
      viewMode: 1,
      autoCropArea: 1,
      background: false,
      zoomable: false,
      movable: false,
      rotatable: false,
      scalable: false,
      ready: schedule,
      crop: schedule,
    });
    return result;
  }

  return { openCrop };
}
