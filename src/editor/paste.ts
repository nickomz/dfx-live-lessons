// Pegar desde Google Docs, Word, Notion u otra página: el HTML se lleva a lo que Live muestra
// (docs/formato.md) antes de que el editor lo lea. Tabla de conversión:
// - título principal (h1, "Title") → MAYÚSCULAS en negrita; otros títulos → negrita;
// - listas → viñetas con su nivel (hasta 3); numeradas → "1. " como texto, con la misma
//   sangría de espacios anchos que las sublistas;
// - tablas → una línea por fila: "*Celda 1:* celda 2 · celda 3";
// - línea horizontal → divisor; salto de página → se cuenta para separar en páginas;
// - saltos de línea dentro de un párrafo → párrafos separados; líneas vacías, hasta 2 seguidas;
// - imágenes → su propia línea, para cargarlas aparte (Docs las pega como links a Google);
// - ✗ (Live no lo tiene) → ✕; espacio duro → espacio común.
// Negrita, cursiva, links y la línea divisoria los lee el editor con sus propias reglas; lo
// que Live no tiene (tachado, subrayado, colores, tamaños) se descarta.

const EM = ' ';
const HEADING = 'h1,h2,h3,h4,h5,h6,p.title';

/** Lo que pasó al convertir, para el resumen y para separar en páginas. */
export interface PasteReport {
  /** Imágenes encontradas (src), en orden. */
  images: string[];
  tables: number;
  pageBreaks: number;
  /** Títulos principales, en orden. */
  titles: string[];
  /** Formatos que Live no tiene y se quitaron. */
  removed: Set<'colores' | 'tachado' | 'subrayado' | 'resaltado' | 'tamaños'>;
}

export const emptyReport = (): PasteReport => ({ images: [], tables: 0, pageBreaks: 0, titles: [], removed: new Set() });

const isPageBreak = (el: Element) => {
  if (el.classList.contains('page-break')) return true;
  const style = (el.getAttribute('style') ?? '').replace(/\s/g, '').toLowerCase();
  return /page-break-(before|after):always|break-(before|after):page/.test(style);
};

function pageBreaks(root: HTMLElement, report: PasteReport) {
  for (const el of [...root.querySelectorAll('hr, br, p, div, span')]) {
    if (!isPageBreak(el)) continue;
    report.pageBreaks++;
    const marker = document.createElement('p');
    marker.setAttribute('data-page-break', 'true');
    // Un <hr> de salto de página no es un divisor: se reemplaza; si es un párrafo, el corte va antes.
    if (el.tagName === 'HR' || el.tagName === 'BR' || el.tagName === 'SPAN') el.replaceWith(marker);
    else el.before(marker);
  }
}

function headings(root: HTMLElement, report: PasteReport) {
  for (const h of [...root.querySelectorAll(HEADING)]) {
    // Docs marca el texto de los títulos con font-weight:400: se saca para que quede en negrita.
    for (const el of h.querySelectorAll<HTMLElement>('[style]')) el.style.removeProperty('font-weight');
    const main = h.tagName === 'H1' || h.classList.contains('title');
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.append(...h.childNodes);
    if (main) {
      // El texto original queda para el nombre de la página, si se separa.
      const original = (strong.textContent ?? '').replace(/\s+/g, ' ').trim();
      for (const t of textNodes(strong)) t.data = t.data.toUpperCase();
      report.titles.push(original);
      p.setAttribute('data-title', original || ' ');
    }
    p.append(strong);
    h.replaceWith(p);
  }
}

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) out.push(walk.currentNode as Text);
  return out;
}

/** Contenido de una celda o un ítem sin los bloques que lo envuelven. */
function inlineContent(el: Element): Node[] {
  const nodes: Node[] = [];
  for (const child of [...el.childNodes]) {
    if (child instanceof Element && /^(UL|OL)$/.test(child.tagName)) continue;
    if (child instanceof Element && /^(P|DIV)$/.test(child.tagName)) {
      if (nodes.length) nodes.push(document.createTextNode(' '));
      nodes.push(...child.childNodes);
    } else nodes.push(child);
  }
  return nodes;
}

function tables(root: HTMLElement, report: PasteReport) {
  for (const table of [...root.querySelectorAll('table')]) {
    if (table.parentElement?.closest('table')) continue;
    report.tables++;
    const rows = [...table.querySelectorAll('tr')].map((tr) => {
      const cells = [...tr.children].filter((c) => /^(TD|TH)$/.test(c.tagName) && (c.textContent ?? '').trim());
      const p = document.createElement('p');
      cells.forEach((cell, i) => {
        if (i === 0) {
          const strong = document.createElement('strong');
          strong.append(...inlineContent(cell), cells.length > 1 ? ':' : '');
          p.append(strong);
        } else {
          p.append(i === 1 ? ' ' : ' · ', ...inlineContent(cell));
        }
      });
      return p;
    });
    table.replaceWith(...rows.filter((p) => p.textContent?.trim()));
  }
}

/** Nivel de un ítem: Docs usa aria-level o la clase lst-kix_..-N; Word, "mso-list: ... levelN". */
function itemLevel(li: Element, depth: number): number {
  const aria = Number(li.getAttribute('aria-level'));
  if (aria) return aria;
  const kix = /lst-kix_[\w]+-(\d+)/.exec(li.parentElement?.className ?? '');
  if (kix) return Number(kix[1]) + 1;
  return depth;
}

/** Convierte las listas (anidadas o planas, como las de Docs) en párrafos con su nivel. */
function lists(root: HTMLElement) {
  for (const list of [...root.querySelectorAll('ul,ol')]) {
    if (!list.isConnected || list.parentElement?.closest('ul,ol')) continue;
    const out: HTMLElement[] = [];
    const counters: number[] = [];
    const walk = (l: Element, depth: number) => {
      const ordered = l.tagName === 'OL';
      for (const child of [...l.children]) {
        if (/^(UL|OL)$/.test(child.tagName)) {
          walk(child, depth + 1);
          continue;
        }
        if (child.tagName !== 'LI') continue;
        const level = Math.min(3, Math.max(1, itemLevel(child, depth)));
        counters.length = level;
        counters[level - 1] = (counters[level - 1] ?? Number(l.getAttribute('start') ?? 1) - 1) + 1;
        const p = document.createElement('p');
        if (ordered) {
          p.append(`${EM.repeat(2 * (level - 1))}${counters[level - 1]}. `);
        } else {
          p.setAttribute('data-bullet', 'true');
          if (level > 1) p.setAttribute('data-level', String(level));
        }
        p.append(...inlineContent(child));
        out.push(p);
        for (const sub of [...child.children].filter((c) => /^(UL|OL)$/.test(c.tagName))) walk(sub, depth + 1);
      }
    };
    walk(list, 1);
    // Las listas de Docs vienen una por nivel y seguidas: se juntan en el orden en que aparecen.
    list.replaceWith(...out);
  }
}

/** Listas de Word: párrafos con "mso-list" y el signo de viñeta en un span aparte. */
function wordLists(root: HTMLElement) {
  for (const p of [...root.querySelectorAll<HTMLElement>('p[style*="mso-list"]')]) {
    const level = Math.min(3, Number(/level(\d)/.exec(p.getAttribute('style') ?? '')?.[1] ?? 1));
    const marker = p.querySelector('[style*="mso-list:Ignore"], [style*="mso-list: Ignore"]');
    const sign = (marker?.textContent ?? '').replace(/\s/g, '');
    marker?.remove();
    if (/^[\dA-Za-z]+[.)]$/.test(sign)) p.prepend(`${EM.repeat(2 * (level - 1))}${sign} `);
    else {
      p.setAttribute('data-bullet', 'true');
      if (level > 1) p.setAttribute('data-level', String(level));
    }
  }
}

/** <p>uno<br>dos</p> → <p>uno</p><p>dos</p>. */
function splitBreaks(root: HTMLElement) {
  for (const block of [...root.querySelectorAll('p,div')]) {
    if (![...block.childNodes].some((c) => c instanceof Element && c.tagName === 'BR')) continue;
    const parts: Node[][] = [[]];
    for (const child of [...block.childNodes]) {
      if (child instanceof Element && child.tagName === 'BR') parts.push([]);
      else parts[parts.length - 1]!.push(child);
    }
    block.replaceWith(
      ...parts.map((nodes) => {
        const p = block.cloneNode(false) as Element;
        p.append(...nodes);
        return p;
      }),
    );
  }
}

/** Cada imagen va en su propia línea, como marca para cargarla (src: link o data:). */
function images(root: HTMLElement, report: PasteReport) {
  for (const img of [...root.querySelectorAll('img')]) {
    const src = img.getAttribute('src') ?? '';
    const block = img.closest('p,div,li,td,h1,h2,h3,h4,h5,h6') ?? img;
    const marker = document.createElement('p');
    if (src) {
      marker.setAttribute('data-pending-image', src);
      report.images.push(src);
    }
    // La imagen sale del párrafo: lo que hay antes queda antes, lo que sigue va después.
    if (block === img) img.replaceWith(marker);
    else {
      img.remove();
      if ((block.textContent ?? '').trim()) block.after(marker);
      else block.replaceWith(marker);
    }
  }
}

/** Anota lo que Live no tiene (para el resumen); el editor lo descarta solo. */
function noteRemoved(root: HTMLElement, report: PasteReport) {
  for (const el of root.querySelectorAll<HTMLElement>('[style], s, strike, del, u, mark, font')) {
    const tag = el.tagName;
    const st = el.style;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(st.textDecoration)) report.removed.add('tachado');
    if ((tag === 'U' || /underline/.test(st.textDecoration)) && !el.closest('a')) report.removed.add('subrayado');
    if (tag === 'MARK' || (st.backgroundColor && !/transparent|rgba\(0, 0, 0, 0\)|#?f{6}|white|255, 255, 255/i.test(st.backgroundColor))) {
      report.removed.add('resaltado');
    }
    if (st.color && !/^(#000000|#000|black|rgb\(0, 0, 0\)|inherit|initial)$/i.test(st.color.trim()) && !el.closest('a')) report.removed.add('colores');
  }
}

/** Vacíos: más de dos párrafos vacíos seguidos se juntan en dos. */
function collapseEmpty(root: HTMLElement) {
  let run = 0;
  for (const el of [...root.querySelectorAll('p')]) {
    const empty = !el.hasAttribute('data-pending-image') && !el.hasAttribute('data-page-break') && !(el.textContent ?? '').trim();
    run = empty ? run + 1 : 0;
    if (run > 2) el.remove();
  }
}

function replaceChars(root: HTMLElement) {
  for (const t of textNodes(root)) t.data = t.data.replace(/✗/g, '✕').replace(/ /g, ' ');
}

export function cleanPastedHTML(html: string, report: PasteReport = emptyReport()): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  for (const el of [...body.querySelectorAll('style,script,meta,link,title,svg,video,audio,iframe,source')]) el.remove();
  noteRemoved(body, report);
  pageBreaks(body, report);
  wordLists(body);
  headings(body, report);
  tables(body, report);
  lists(body);
  splitBreaks(body);
  images(body, report);
  collapseEmpty(body);
  replaceChars(body);
  return body.innerHTML;
}
