import { describe, expect, it } from 'vitest';
import { buildTarget, lessonFiles, linkKind, parseLesson, readLessonFolder, LANGUAGES } from '../src/lesson';

const enc = (s: string) => new TextEncoder().encode(s);

describe('links que crea el docente', () => {
  it.each([
    ['page', 'Final', 'GotoPage:Final'],
    ['web', 'http://ableton.com', 'https://ableton.com'],
    ['web', 'www.youtube.com/@Ableton', 'https://www.youtube.com/@Ableton'],
    ['web', 'https://fors.fm', 'https://fors.fm'],
    ['email', 'prueba@ejemplo.com', 'mailto:prueba@ejemplo.com'],
    ['set', 'Ejercicio 2', 'Set:Ejercicio 2.als'],
    ['set', 'Ejercicio 2.als', 'Set:Ejercicio 2.als'],
  ] as const)('%s "%s" → %s', (kind, value, target) => {
    expect(buildTarget(kind, value)).toBe(target);
  });

  it('distingue los tipos que el editor ofrece', () => {
    expect(linkKind('GotoPage:X')).toBe('page');
    expect(linkKind('Set:a.als')).toBe('set');
    expect(linkKind('Pref:audio')).toBeNull();
    expect(linkKind('Lesson:Builtin/X')).toBeNull();
  });
});

describe('carpeta de lección', () => {
  it('detecta si los idiomas tienen textos distintos', () => {
    const same = readLessonFolder(new Map([
      ['LessonsEN.txt', enc('$Page A\nHola\n')],
      ['LessonsES.txt', enc('﻿$Page A\r\nHola\r\n')],
      ['img.png', new Uint8Array([1, 2])],
    ]));
    expect(same.languagesDiffer).toBe(false);
    expect([...same.lessons.keys()]).toEqual(['LessonsEN.txt', 'LessonsES.txt']);
    expect([...same.assets.keys()]).toEqual(['img.png']);

    const differ = readLessonFolder(new Map([
      ['LessonsEN.txt', enc('$Page A\nHello\n')],
      ['LessonsES.txt', enc('$Page A\nHola\n')],
    ]));
    expect(differ.languagesDiffer).toBe(true);
  });

  it('exporta la misma lección en los 7 idiomas, más las imágenes', () => {
    const files = lessonFiles(parseLesson(enc('$Page A\nHola\n')), new Map([['Large/img.png', new Uint8Array([9])]]));
    expect([...files.keys()]).toEqual([...LANGUAGES.map((l) => `Lessons${l}.txt`), 'Large/img.png']);
  });
});
