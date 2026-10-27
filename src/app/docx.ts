// Importar un .docx (Word, o Google Docs con Archivo → Descargar → .docx). mammoth.js lo pasa a
// HTML en el navegador, con las imágenes adentro; después sigue el mismo camino que lo pegado
// (src/editor/paste.ts). Se carga recién al importar.

import type Mammoth from 'mammoth';

// Los estilos de Word que importan para Live: título y subtítulo, y el salto de página.
const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "br[type='page'] => hr.page-break",
];

// mammoth no lee las líneas horizontales: Docs las guarda como un dibujo (v:rect o:hr) dentro
// de un párrafo y Word como el borde de abajo de un párrafo. Se marcan en el XML con este texto
// y después se cambian por <hr>.
const HR = 'HR';

async function markRules(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(bytes);
  const file = zip.file('word/document.xml');
  if (!file) return bytes;
  let xml = await file.async('string');
  const run = `<w:r><w:t>${HR}</w:t></w:r>`;
  xml = xml.replace(/<w:pict>(?:(?!<\/w:pict>).)*?o:hr="t"(?:(?!<\/w:pict>).)*?<\/w:pict>/gs, `<w:t>${HR}</w:t>`);
  // Borde de abajo visible en un párrafo: la línea va después.
  xml = xml.replace(/(<w:p[ >](?:(?!<\/w:p>).)*?<w:pBdr>(?:(?!<\/w:pBdr>).)*?<w:bottom(?![^>]*w:val="(?:nil|none)")[^>]*\/>(?:(?!<\/w:p>).)*?)(<\/w:p>)/gs, `$1${run}$2`);
  zip.file('word/document.xml', xml);
  return zip.generateAsync({ type: 'arraybuffer' });
}

/** Cambia las marcas por <hr>: antes del párrafo si la marca está al principio, si no después. */
function rulesToHr(html: string): string {
  const box = document.createElement('div');
  box.innerHTML = html;
  for (const p of [...box.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6')]) {
    const text = p.textContent ?? '';
    if (!text.includes(HR)) continue;
    const before = text.trimStart().startsWith(HR);
    for (const node of [...p.querySelectorAll('*'), p].flatMap((el) => [...el.childNodes]).filter((n) => n.nodeType === Node.TEXT_NODE)) {
      node.textContent = (node.textContent ?? '').split(HR).join('');
    }
    const hr = document.createElement('hr');
    if (before) p.before(hr);
    else p.after(hr);
    if (!(p.textContent ?? '').trim() && !p.querySelector('img')) p.remove();
  }
  return box.innerHTML;
}

export async function docxToHtml(bytes: ArrayBuffer): Promise<string> {
  const mod = (await import('mammoth/mammoth.browser.min.js')) as { default?: typeof Mammoth } & typeof Mammoth;
  const mammoth = mod.default ?? mod;
  const result = await mammoth.convertToHtml({ arrayBuffer: await markRules(bytes) }, { styleMap: STYLE_MAP, ignoreEmptyParagraphs: false });
  return rulesToHr(result.value);
}

export const isDocx = (name: string) => /\.docx$/i.test(name);
