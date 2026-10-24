// Tipos de link y reglas para los links que crea el docente.
// Probado en Live 12.4.7 y 11.3 (docs/formato.md): GotoPage, https, mailto y Set (con .als).

export type LinkKind = 'page' | 'web' | 'email' | 'set';

const SUPPORTED: Record<string, LinkKind> = {
  'GotoPage:': 'page',
  'https:': 'web',
  'http:': 'web',
  'mailto:': 'email',
  'Set:': 'set',
};

/** Tipo de un destino de link, o `null` si el editor no ofrece ese tipo. */
export function linkKind(target: string): LinkKind | null {
  const scheme = /^[A-Za-z]+:/.exec(target)?.[0];
  return (scheme && SUPPORTED[scheme]) || null;
}

/**
 * Arma el destino de un link a partir de lo que escribió el docente.
 * Solo se usa al crear o editar un link: lo que se leyó de un archivo no se toca.
 */
export function buildTarget(kind: LinkKind, value: string): string {
  const v = value.trim();
  switch (kind) {
    case 'page':
      return `GotoPage:${v.replace(/^GotoPage:/, '')}`;
    case 'web': {
      // Los links http:// no abrieron nada en Live 12.4.7: se pasan a https://.
      const url = v.replace(/^http:\/\//i, 'https://');
      return /^https:\/\//i.test(url) ? url : `https://${url}`;
    }
    case 'email':
      return `mailto:${v.replace(/^mailto:/i, '')}`;
    case 'set': {
      // Sin la extensión, Live da "Failed to resolve the link".
      const name = v.replace(/^Set:/, '');
      return `Set:${/\.als$/i.test(name) ? name : `${name}.als`}`;
    }
  }
}
