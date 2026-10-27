// Viñetas y sublistas, como las dibuja Live (docs/formato.md, "Sangría y sublistas"):
// nivel 1 es "-> " al principio de la línea (Live ignora los espacios comunes antes); los
// niveles 2 y 3 no existen como tales, pero Live respeta los espacios anchos (U+2003) al
// principio de la línea, así que se escriben con esa sangría y otro signo de viñeta.

export type BulletLevel = 1 | 2 | 3;

const EM = '\u2003';
export const BULLET_PREFIX: Record<BulletLevel, string> = {
  1: '-> ',
  2: `${EM}${EM}• `,
  3: `${EM}${EM}${EM}${EM}◦ `,
};

/** Si la línea es una viñeta, su nivel y el texto que sigue al signo. */
export function readBullet(raw: string): { level: BulletLevel; rest: string } | null {
  const level1 = /^ *-> /.exec(raw);
  if (level1) return { level: 1, rest: raw.slice(level1[0].length) };
  for (const level of [2, 3] as const) {
    if (raw.startsWith(BULLET_PREFIX[level])) return { level, rest: raw.slice(BULLET_PREFIX[level].length) };
  }
  return null;
}
