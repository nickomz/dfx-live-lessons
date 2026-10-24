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

  it('reconoce cursiva dentro de negrita', () => {
    expect(parseEmphasis('*muy /importante/*')).toEqual([
      { type: 'text', text: 'muy ', bold: true },
      { type: 'text', text: 'importante', bold: true, italic: true },
    ]);
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
    'Texto con *negrita*, /cursiva/ y */las dos/*.',
    'Mirá $Link el *video* <https://www.youtube.com/@Ableton> y $Link Foto.png <GotoPage:Fin>',
    'Abrí $Link Ejercicio 2 <Set:Ejercicio 2.als> o escribí a $Link mi mail <mailto:a@b.com>',
    'pads/texturas/drones y 3 * 4',
  ])('escribir y volver a leer da lo mismo: %s', (s) => {
    const inlines = parseInlines(s);
    expect(parseInlines(serializeInlines(inlines))).toEqual(inlines);
  });
});
