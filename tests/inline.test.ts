import { describe, expect, it } from 'vitest';
import { parseEmphasis, parseInlines, serializeInlines } from '../src/lesson';

const plain = (s: string) => [{ type: 'text', text: s }];

describe('negrita y cursiva', () => {
  it('reconoce *negrita* y /cursiva/ al borde de palabra', () => {
    expect(parseEmphasis('con *negrita* y /cursiva/ acá')).toEqual([
      { type: 'text', text: 'con ' },
      { type: 'text', text: 'negrita', bold: true },
      { type: 'text', text: ' y ' },
      { type: 'text', text: 'cursiva', italic: true },
      { type: 'text', text: ' acá' },
    ]);
  });

  it('reconoce una línea entera en negrita', () => {
    expect(parseEmphasis('*BIENVENIDO!*')).toEqual([{ type: 'text', text: 'BIENVENIDO!', bold: true }]);
  });

  // Prueba en Live 12.4.7 del 24/10/2026 (docs/formato.md, "Negrita y cursiva").
  it('un marcador pegado a un signo no cierra: el formato sigue hasta el final', () => {
    expect(parseEmphasis('Hola /cursiva/. fin')).toEqual([
      { type: 'text', text: 'Hola ' },
      { type: 'text', text: 'cursiva/. fin', italic: true },
    ]);
  });

  it('un marcador después de un signo no abre', () => {
    expect(parseEmphasis('Hola (/cursiva/) fin')).toEqual(plain('Hola (/cursiva/) fin'));
    expect(parseEmphasis('Hola "*negrita*" fin')).toEqual(plain('Hola "*negrita*" fin'));
  });

  it('no hay negrita y cursiva juntas: adentro de la negrita la barra queda literal', () => {
    expect(parseEmphasis('Hola */negrita cursiva/* fin')).toEqual([
      { type: 'text', text: 'Hola ' },
      { type: 'text', text: '/negrita cursiva/', bold: true },
      { type: 'text', text: ' fin' },
    ]);
  });

  it('cursiva adentro de negrita: se ve en cursiva y después vuelve la negrita', () => {
    expect(parseEmphasis('Mezcla: *negrita con /cursiva adentro/ y sigue* fin')).toEqual([
      { type: 'text', text: 'Mezcla: ' },
      { type: 'text', text: 'negrita con ', bold: true },
      { type: 'text', text: 'cursiva adentro', italic: true },
      { type: 'text', text: ' y sigue', bold: true },
      { type: 'text', text: ' fin' },
    ]);
  });

  it('asteriscos con espacio alrededor quedan literales', () => {
    expect(parseEmphasis('* /x/ *')).toEqual([{ type: 'text', text: '* ' }, { type: 'text', text: 'x', italic: true }, { type: 'text', text: ' *' }]);
  });

  it('un marcador que cierra sin haber abierto desaparece', () => {
    expect(parseEmphasis('Hola pads/ texturas')).toEqual([{ type: 'text', text: 'Hola pads' }, { type: 'text', text: ' texturas' }]);
  });

  it('el espacio de ancho cero al lado de un marcador literal no es texto', () => {
    expect(parseEmphasis('Ver \u200b/ruta y pads/\u200b texturas')).toEqual(plain('Ver /ruta y pads/ texturas'));
  });

  // Casos de la prueba en Live 12.4.7 (docs/capturas/live12-09-caracteres-sueltos.jpg): todos literales.
  it.each([
    'pads/texturas/drones',
    '1/4 y 1/8 de nota',
    'youtube.com/watch/abc',
    'Samples/Drums/Kick.wav',
    '-6 dB * 2',
    '3 * 4 * 5',
    'nota*importante',
    'A -> B',
    '<menor> y $dolar y 100%',
  ])('deja literal "%s"', (s) => {
    expect(parseEmphasis(s)).toEqual(plain(s));
  });
});

describe('links', () => {
  it('lee un link en medio de una frase', () => {
    expect(parseInlines('Consultá el $Link manual <https://www.ableton.com/manual/>. Fin')).toEqual([
      { type: 'text', text: 'Consultá el ' },
      { type: 'link', target: 'https://www.ableton.com/manual/', label: { type: 'text', runs: plain('manual') } },
      { type: 'text', text: '. Fin' },
    ]);
  });

  it('acepta el link sin espacio antes de "<" (lección de Lode)', () => {
    expect(parseInlines('$Link *Fors*<https://fors.fm>')).toEqual([
      { type: 'link', target: 'https://fors.fm', label: { type: 'text', runs: [{ type: 'text', text: 'Fors', bold: true }] } },
    ]);
  });

  it('lee una imagen usada como link', () => {
    expect(parseInlines('$Link Beats.png[alt="Creating Beats"] <GotoPage:Beats>')).toEqual([
      { type: 'link', target: 'GotoPage:Beats', label: { type: 'image', file: 'Beats.png', alt: 'Creating Beats' } },
    ]);
  });

  it('conserva intactos los links que el editor no ofrece', () => {
    expect(parseInlines('Abrí $Link las preferencias <Pref:audio> ahora')).toEqual([
      { type: 'text', text: 'Abrí ' },
      { type: 'rawLink', source: '$Link las preferencias <Pref:audio>' },
      { type: 'text', text: ' ahora' },
    ]);
  });

  it('la barra dentro del texto de un link queda literal', () => {
    expect(parseInlines('$Link Link con a/b/c <GotoPage:X>')).toEqual([
      { type: 'link', target: 'GotoPage:X', label: { type: 'text', runs: plain('Link con a/b/c') } },
    ]);
  });
});

describe('formato canónico', () => {
  it.each([
    'Texto con *negrita* y /cursiva/ y *las dos.*',
    'Mirá $Link el *video* <https://www.youtube.com/@Ableton> y $Link Foto.png <GotoPage:Fin>',
    'Abrí $Link Ejercicio 2 <Set:Ejercicio 2.als> o escribí a $Link mi mail <mailto:a@b.com>',
    'pads/texturas/drones y 3 * 4',
  ])('escribir y volver a leer da lo mismo: %s', (s) => {
    const inlines = parseInlines(s);
    expect(parseInlines(serializeInlines(inlines))).toEqual(inlines);
  });

  const t = (text: string, style: { bold?: boolean; italic?: boolean } = {}) => ({ type: 'text' as const, text, ...style });

  it('el formato pegado a un signo lo incluye, para que Live lo cierre', () => {
    expect(serializeInlines([t('Hola '), t('cursiva', { italic: true }), t('. Y '), t('negrita', { bold: true }), t(',')])).toBe(
      'Hola /cursiva./ Y *negrita,*',
    );
  });

  it('el formato en media palabra toma la palabra entera', () => {
    expect(serializeInlines([t('super'), t('negrita', { bold: true }), t(' fin')])).toBe('*supernegrita* fin');
  });

  it('negrita y cursiva juntas quedan en negrita', () => {
    expect(serializeInlines([t('Hola '), t('las dos', { bold: true, italic: true })])).toBe('Hola *las dos*');
  });

  it('palabras seguidas con el mismo formato van en un solo tramo', () => {
    expect(serializeInlines([t('uno', { bold: true }), t(' '), t('dos', { bold: true }), t(' tres')])).toBe('*uno dos* tres');
  });

  it('un * o una / literal que Live tomaría como marcador lleva un espacio de ancho cero', () => {
    expect(serializeInlines([t('Ver /ruta y pads/ texturas, 1/4 y 3 * 4')])).toBe('Ver \u200b/ruta y pads/\u200b texturas, 1/4 y 3 * 4');
    expect(parseInlines(serializeInlines([t('Ver /ruta y *nota')]))).toEqual([t('Ver /ruta y *nota')]);
  });

  it('una palabra pegada a un link no lleva formato', () => {
    expect(serializeInlines([t('(ver', { bold: true }), { type: 'link', target: 'GotoPage:X', label: { type: 'text', runs: [t('acá')] } }, t(')')])).toBe(
      '(ver$Link acá <GotoPage:X>)',
    );
  });
});
