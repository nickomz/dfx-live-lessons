# Roadmap

Cada etapa termina en algo que Nicko puede ver y aprobar antes de pasar a la siguiente. Primero va lo que más puede salir mal (el formato de Live y el motor que lo lee y escribe); lo visual viene después, sobre una base probada.

**No se escribe código de la app hasta que Nicko lo indique.**

| Etapa | Estado |
|---|---|
| 0. Estrategia | Terminada |
| 1. Prueba en Live | Terminada |
| 2. El motor | Terminada |
| 3. Primera versión mínima | Terminada |
| 4. Versión completa (v1) | Terminada |
| 5. Prueba con docentes | Pendiente |
| 6. Lanzamiento | Pendiente |

---

## 0. Estrategia

Definir qué se construye, para quién y cómo se ve, antes de programar.

- [x] Brief del proyecto (`docs/BRIEF.md`)
- [x] Investigación sobre las lecciones de Live y la Learn View
- [x] Diseño de referencia minimalista, escritorio y celular: https://claude.ai/artifact/Pqcg8jZ1uCjEPrLNEM2kHe
- [x] Versiones soportadas: Live 11 o superior, imágenes PNG
- [x] Licencia MIT
- [x] Logo de DFX en el repo (`assets/brand/dfx-logo.svg`)
- [x] Aviso de que el proyecto no está afiliado a Ableton
- [x] Nicko aprueba el diseño minimalista
- [x] Paleta monocromática: blanco sobre oscuro, sin color de acento

**Termina cuando:** Nicko aprueba el diseño.

## 1. Prueba en Live

Confirmar en Live real cómo se ve y se comporta cada elemento del formato. La hace Claude con el control de la compu; no es código.

- [x] Probar en Live 12.4.7 cada elemento: negrita, cursiva, viñetas, imágenes (260 px, `Large/`, más anchas, JPG, GIF), divisor, links entre páginas y a URLs (YouTube).
- [x] Repetir lo esencial en Live 11.3.
- [x] Probar acentos, ñ y comillas; BOM y saltos de línea de Windows; qué pasa con Save As y Collect All.
- [x] Sacar capturas de referencia del panel (`docs/capturas/`).
- [ ] `Large/` en Live 12 con Retina y Windows: quedaron sin probar (ver `docs/formato.md`).
- Prueba sin internet: descartada. Nicko nunca tuvo problemas con lecciones sin conexión y el resultado no cambiaría el código.
- [x] Probar en Live 12.4.7 y 11.3 los links `mailto:` y `Set:` a un Set de la misma carpeta, y qué pasa si el Set no existe.

Resultado: [`docs/formato.md`](formato.md), aprobado por Nicko.

**Termina cuando:** Nicko revisa `docs/formato.md` con la sintaxis probada y las capturas.

## 2. El motor

El código que lee y escribe los archivos `Lessons*.txt`. No se ve, pero todo lo demás se apoya en él.

- [x] Lector y escritor del formato, con pruebas automáticas (`src/lesson/`, `tests/`).
- [x] Prueba de ida y vuelta: abrir una lección y guardarla deja el archivo idéntico, carácter por carácter.
- [x] Los elementos que el editor no ofrece (links `Pref:`, `Browse…`, `$If`, etc.) se conservan intactos.

Resultado (24/10/2026): 46 pruebas pasan. Las 926 lecciones instaladas en la Mac (Live 11.3, 12.0, 12.3 y 12.4, Factory Packs y User Library), la lección de la plantilla MZ y la de Lode se escriben idénticas byte por byte, y cada línea de texto y viñeta se reescribe en el formato canónico sin cambiar su contenido.

**Termina cuando:** el round-trip es idéntico, carácter por carácter, con:
- las lecciones que traen Live y los Packs instalados, solo como tests locales: no se suben al repo porque son propietarias;
- la lección del synth Lode ([github.com/fors-fm/lode](https://github.com/fors-fm/lode), `Lode Lessons/LessonsEN.txt`, licencia MIT), que va al repo como fixture público con su aviso de licencia.

## 3. Primera versión mínima

Algo usable, aunque básico, para confirmar que vamos bien.

- [x] Editor con la réplica del panel de Live.
- [x] Páginas: agregar, quitar, reordenar, renombrar.
- [x] Negrita, cursiva, viñetas y línea divisoria.
- [x] Exportar el `.zip` con los 7 idiomas, pidiendo el nombre del set, con las instrucciones después de descargar.
- [x] Layout que ya se adapta al celular.

**Termina cuando:** una lección hecha en la app se ve en Live igual que en el editor (capturas lado a lado).

Resultado (24/10/2026): una lección de 3 páginas armada en la app y exportada se ve en Live 12.4.7 con el mismo contenido y formato en las tres páginas ([`docs/capturas/comparacion-app-vs-live12.png`](capturas/comparacion-app-vs-live12.png)). En Live 11.3 se verificó la página 1 (`live11-05-app-bienvenida.jpg`); las páginas 2 y 3 no se pudieron navegar porque, con su zoom de interfaz, Live 11 no entra en la pantalla de la notebook, pero usan elementos ya confirmados en Live 11 en la Fase 0.

Para pulir en la etapa 4:
- Live muestra el texto con más peso que Jost: comparar con una variante más gruesa.
- Las viñetas de Live son un cuadradito (▪), no un punto.
- En Live el divisor va pegado al texto de arriba y de abajo.
- ~~Probar la descarga del zip en Safari y Firefox~~: confirmada por Nicko en la etapa 4.

## 4. Versión completa (v1)

Todo lo que pide el alcance v1 del brief.

- [x] Imágenes: arrastrar, elegir, pegar; ajuste automático a 260/520 px.
- [x] Links entre páginas, a URLs, a email y a otro Set.
- [x] Pegar desde Google Docs y Notion.
- [x] Abrir una lección existente (carpeta o `.zip`).
- [x] Borrador guardado automáticamente.
- [x] Uso en el celular.
- [x] Interfaz en español e inglés.
- [x] Pantalla de instrucciones después de exportar (Mac y Windows).
- [x] Retoques del panel: peso del texto, viñeta cuadrada, divisor pegado al texto.
- [x] Prueba de Nicko en Safari, Firefox y su celular (24/10/2026, con la app publicada: anduvo todo, incluida la descarga del zip).

**Termina cuando:** se cumplen los criterios de terminado del brief.

Verificación final (24/10/2026): una lección armada en la app con formato, viñetas, divisor, una imagen pegada de 600 px y los cuatro tipos de link ([`docs/pruebas/verificacion-final Lessons/`](pruebas/verificacion-final%20Lessons/)) se ve bien en Live 12.4.7 y en Live 11.3 ([`live12-15`](capturas/live12-15-verificacion-final.jpg), [`live11-06`](capturas/live11-06-verificacion-final.jpg)). En Live 12 se probaron los cuatro links; en Live 11, el de página y el de Set. Reabierta en la app y exportada de nuevo sin cambios, sale idéntica byte por byte.

La verificación encontró un error: Live no cierra la negrita ni la cursiva si el marcador va pegado a un signo (`/cursiva/.`), y el formato sigue hasta el final de la página. Se probó la regla exacta en Live y la app ahora escribe como Live lee (ver "Negrita y cursiva" en `docs/formato.md`).

## 5. Prueba con docentes

Lo que para nosotros es obvio, alguien que nunca vio la app no lo encuentra.

- Pasarle el link a 2 o 3 docentes y mirar dónde se traban.
- Corregir lo que aparezca.

**Termina cuando:** un docente arma y coloca su primera lección sin ayuda.

## 6. Lanzamiento

- ~~Publicar en GitHub Pages~~: adelantado durante la etapa 4 para probar en el celular y compartir en las pruebas. Se publica solo en cada push a `main` (https://nickomz.github.io/dfx-live-lessons/).
- Subdominio propio (propuesta: `lessons.nickomz.com`, a confirmar con Nicko).
- Actualizar el README con el link y sacar el aviso de "en diseño".
- Anunciarlo (comunidad DFX, Instagram).

**Termina cuando:** la app está online y es pública.

## Después: v2

Lo que el brief deja afuera de v1, priorizado según lo que pidan los usuarios:

- Traducción automática ES↔EN.
- Búsqueda de imágenes en Unsplash o Pexels.
- Links que abren carpetas del browser de Live.
- Arrastrar el proyecto entero a la app para elegir los Sets de una lista.
- Lista de lecciones guardadas (una por set), para pasar de una a otra sin exportar. En v1 se trabaja una lección a la vez.
