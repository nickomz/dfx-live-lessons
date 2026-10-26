// Ventana para recortar una imagen. Live dibuja las imágenes a 260 px de ancho sin adaptarlas
// al panel, así que una captura de pantalla entera no se lee: el docente elige la parte que
// importa y ve al lado cómo va a quedar. Cropper.js se carga recién al abrir la ventana.

import 'cropperjs/dist/cropper.css';
import type Cropper from 'cropperjs';
import { WIDTH } from './images';
import { t } from './strings';

interface CropOptions {
  /** Recibe la parte elegida, a resolución completa, y si hay que agrandarla al ancho del panel. */
  onApply: (blob: Blob, fit: boolean) => void | Promise<void>;
}

export function setupCrop({ onApply }: CropOptions) {
  const dialog = document.createElement('dialog');
  dialog.className = 'dlg crop-dlg';
  dialog.setAttribute('aria-labelledby', 'crop-title');
  dialog.innerHTML = `
    <div class="dlg-body">
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
        <button type="button" class="primary wide" id="crop-ok">${t.linkApply}</button>
      </div>
    </div>`;
  document.body.append(dialog);

  const q = <T extends HTMLElement>(sel: string) => dialog.querySelector(sel) as T;
  const img = q<HTMLImageElement>('#crop-img');
  const canvas = q<HTMLCanvasElement>('#crop-canvas');
  const fitBox = q('#crop-fit-box');
  const fit = q<HTMLInputElement>('#crop-fit');
  let cropper: Cropper | null = null;
  let url = '';
  let frame = 0;

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
  }
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(preview);
  };
  fit.addEventListener('change', preview);

  function close() {
    cropper?.destroy();
    cropper = null;
    if (url) URL.revokeObjectURL(url);
    url = '';
    dialog.close();
  }
  q('#crop-cancel').addEventListener('click', close);
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });

  q('#crop-ok').addEventListener('click', async () => {
    if (!cropper) return;
    const ok = q<HTMLButtonElement>('#crop-ok');
    ok.disabled = true;
    try {
      const blob = await new Promise<Blob | null>((r) => cropper!.getCroppedCanvas({ imageSmoothingQuality: 'high' }).toBlob(r, 'image/png'));
      if (blob) await onApply(blob, !fitBox.hidden && fit.checked);
      close();
    } finally {
      ok.disabled = false;
    }
  });

  /** Abre la ventana con la imagen original (o la mejor copia que haya). */
  async function openCrop(bytes: Uint8Array) {
    const { default: CropperJS } = await import('cropperjs');
    url = URL.createObjectURL(new Blob([bytes as BlobPart]));
    fit.checked = false;
    img.src = url;
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
  }

  return { openCrop };
}
