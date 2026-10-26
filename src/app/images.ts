// Imágenes de la lección. Live solo muestra PNG y no achica las imágenes anchas
// (docs/formato.md), así que toda imagen se convierte a PNG de 260 px de ancho, más una
// copia al doble (hasta 520 px) en Large/ para pantallas Retina. No se agranda, salvo que el
// docente elija "Ajustar al ancho" al recortar.

export const WIDTH = 260;
export const LARGE_WIDTH = 520;
/** La imagen original de cada una, para volver a recortar sin perder calidad. No se exporta. */
export const ORIGINALS = 'Originales/';

/** Nombre de archivo para Live: sin acentos ni espacios, .png y sin repetir los ya usados. */
export function imageName(original: string | undefined, used: Set<string>): string {
  const base = (original ?? '')
    .replace(/\.[^.]*$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const stem = base && base.toLowerCase() !== 'image' ? base : 'imagen';
  if (stem !== 'imagen' && !used.has(`${stem}.png`)) return `${stem}.png`;
  let n = 1;
  while (used.has(`${stem}-${n}.png`)) n++;
  return `${stem}-${n}.png`;
}

async function toPng(bitmap: ImageBitmap, width: number): Promise<Uint8Array> {
  const height = Math.max(1, Math.round((bitmap.height * width) / bitmap.width));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

export interface ProcessedImage {
  small: Uint8Array;
  large?: Uint8Array;
  /** Ancho de la imagen que entró, en px. */
  width: number;
}

/**
 * Convierte cualquier imagen que el navegador sepa abrir en las versiones para Live. Con
 * `fit`, una imagen de menos de 260 px se agranda al ancho del panel.
 */
export async function processImage(file: Blob, { fit = false } = {}): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const small = await toPng(bitmap, fit ? WIDTH : Math.min(WIDTH, bitmap.width));
    // La copia en Large/ solo tiene sentido si la original es más ancha que 260 px.
    const large = bitmap.width > WIDTH ? await toPng(bitmap, Math.min(LARGE_WIDTH, bitmap.width)) : undefined;
    return large ? { small, large, width: bitmap.width } : { small, width: bitmap.width };
  } finally {
    bitmap.close();
  }
}

/**
 * Deja afuera las imágenes que ya no usa ninguna línea (por ejemplo, una que se agregó y
 * después se borró). Lo que no es imagen, o se menciona en el texto, se conserva.
 */
export function usedAssets(assets: Map<string, Uint8Array>, text: string): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  for (const [path, data] of assets) {
    if (path.startsWith(ORIGINALS)) continue;
    const file = path.replace(/^Large\//, '');
    if (!/\.(png|tiff?|jpe?g|gif)$/i.test(file) || text.includes(file)) out.set(path, data);
  }
  return out;
}
