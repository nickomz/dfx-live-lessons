// Modelo de una lección de Live (archivo Lessons<IDIOMA>.txt).
// Referencia del formato: docs/formato.md.
//
// Cada bloque es una línea del archivo. Los bloques leídos guardan `raw`, el texto
// original de la línea: mientras nadie lo edite, el escritor lo vuelve a escribir tal
// cual, y así el round-trip queda idéntico. Un bloque creado o editado en la app no
// tiene `raw` y se escribe en el formato canónico.

export type Inline = TextRun | LinkInline | RawLinkInline;

export interface TextRun {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** Link que el editor ofrece: a otra página, a una web, a un email o a otro Set. */
export interface LinkInline {
  type: 'link';
  target: string;
  label: LinkLabel;
}

export type LinkLabel =
  | { type: 'text'; runs: TextRun[] }
  | { type: 'image'; file: string; alt?: string };

/** Link de un tipo que el editor no ofrece (`Pref:`, `Lesson:`, etc.): se conserva intacto. */
export interface RawLinkInline {
  type: 'rawLink';
  source: string;
}

export type Block =
  | { type: 'text'; inlines: Inline[]; raw?: string }
  | { type: 'bullet'; inlines: Inline[]; raw?: string }
  | { type: 'image'; file: string; alt?: string; raw?: string }
  | { type: 'divider'; raw?: string }
  | { type: 'blank'; raw?: string }
  | { type: 'comment'; text: string; raw?: string }
  | { type: 'target'; name: string; raw?: string }
  /** Línea que el editor no ofrece ($If, $Else, $ListInTocForProduct...): se muestra como bloque gris y se conserva. */
  | { type: 'unsupported'; raw: string };

export interface Page {
  title: string;
  /** Línea `$Page` original; falta en páginas nuevas o con el título editado. */
  raw?: string;
  blocks: Block[];
}

export interface Lesson {
  /** Líneas antes del primer `$Page` (Live no muestra nada si hay texto visible ahí). */
  preamble: string[];
  pages: Page[];
  /** Archivo original tal como se leyó; si la lección no cambió, se escribe esto mismo. */
  source?: Uint8Array;
}
