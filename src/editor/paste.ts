// Pegar desde Google Docs, Notion u otra página: el HTML se lleva a lo que Live muestra
// (docs/formato.md) antes de que el editor lo lea. Lo que Live no tiene se convierte o se
// descarta:
// - títulos → una línea en negrita (Ableton hace lo mismo en sus lecciones);
// - listas con viñetas → viñetas; listas numeradas → líneas con "1. ", "2. "...;
// - saltos de línea dentro de un párrafo → párrafos separados;
// - imágenes → afuera (Docs las pega como links a sus servidores; se agregan aparte).
// Negrita, cursiva, links y la línea divisoria los lee el editor con sus propias reglas.

const HEADING = 'h1,h2,h3,h4,h5,h6';

function headingsToBold(root: ParentNode) {
  for (const h of [...root.querySelectorAll(HEADING)]) {
    // Docs marca el texto de los títulos con font-weight:400: se saca para que quede en negrita.
    for (const el of h.querySelectorAll<HTMLElement>('[style]')) el.style.removeProperty('font-weight');
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.append(...h.childNodes);
    p.append(strong);
    h.replaceWith(p);
  }
}

/** El contenido de un <li> sin las sublistas y sin los <p> que agrega Docs. */
function itemContent(li: Element): Node[] {
  const nodes: Node[] = [];
  for (const child of [...li.childNodes]) {
    if (child instanceof Element && (child.tagName === 'UL' || child.tagName === 'OL')) continue;
    if (child instanceof Element && (child.tagName === 'P' || child.tagName === 'DIV')) nodes.push(...child.childNodes);
    else nodes.push(child);
  }
  return nodes;
}

/** Convierte una lista (y sus sublistas, aplanadas) en párrafos. */
function listToParagraphs(list: Element): HTMLElement[] {
  const out: HTMLElement[] = [];
  const ordered = list.tagName === 'OL';
  let n = Number(list.getAttribute('start') ?? 1);
  for (const li of [...list.children].filter((c) => c.tagName === 'LI')) {
    const p = document.createElement('p');
    if (ordered) p.append(`${n++}. `);
    else p.setAttribute('data-bullet', 'true');
    p.append(...itemContent(li));
    out.push(p);
    for (const sub of [...li.children].filter((c) => c.tagName === 'UL' || c.tagName === 'OL')) out.push(...listToParagraphs(sub));
  }
  return out;
}

function listsToParagraphs(root: ParentNode) {
  // De afuera hacia adentro: cada lista de primer nivel se reemplaza con todos sus ítems.
  for (const list of [...root.querySelectorAll('ul,ol')]) {
    if (list.parentElement?.closest('ul,ol')) continue;
    list.replaceWith(...listToParagraphs(list));
  }
}

/** <p>uno<br>dos</p> → <p>uno</p><p>dos</p>. */
function splitBreaks(root: ParentNode) {
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

export function cleanPastedHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  for (const el of [...body.querySelectorAll('img,picture,video,audio,iframe,svg,style,script,meta')]) el.remove();
  headingsToBold(body);
  listsToParagraphs(body);
  splitBreaks(body);
  return body.innerHTML;
}
