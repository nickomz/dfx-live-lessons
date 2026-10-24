# DFX Live Lessons — brief del proyecto

App web gratuita y open source para que docentes de producción musical escriban lecciones que aparecen dentro de Ableton Live al abrir un proyecto. Reemplaza una versión anterior que resultó sobrecargada y poco intuitiva. Referencia de origen: https://github.com/phelankane/Live-Lessons-Generator (app JUCE de 2021, solo Mac, solo genera el `.txt`).

Trabajá en español rioplatense. Antes de cada fase, mostrame el plan; dentro de una fase, avanzá sin pedir confirmación en cada paso.

---

## Cómo funciona el formato (verificado)

- Una lección vive en una carpeta junto al `.als`, dentro de la carpeta del proyecto:
  ```
  Mi Set Project/
  ├── Mi Set.als
  └── Mi Set Lessons/
      ├── LessonsEN.txt
      ├── LessonsES.txt
      ├── imagen.png
      └── Large/
          └── imagen.png
  ```
- El nombre de la carpeta es el nombre del set + ` Lessons`. Tiene que coincidir.
- El archivo tiene que empezar exactamente con `$Page`. Un carácter antes (ej. `\$Page`) y Live no muestra nada.
- Codificación: la app escribe siempre UTF-8 sin BOM, con saltos de línea LF, como los `Lessons*.txt` que trae Live. Probado en Fase 0: Live también lee archivos con BOM o con saltos de Windows (CRLF), así que al abrir una lección existente la app los acepta.
- La referencia completa de lo que Live muestra, con capturas, es **`docs/formato.md`** (Fase 0, probado en Live 12.4.7 y 11.3).
- **Probado y funcionando en Live 12.4.7 (Mac)**: Live 12.4 reemplazó la Help View por la Learn View, pero las lecciones por proyecto siguen cargando. Hay un proyecto de prueba en `~/Desktop/test Project`.
- **Versiones soportadas: Live 11 y 12, con imágenes PNG.** Es lo que se puede probar: en la Mac están instaladas 11.3, 12.0, 12.3 y 12.4, y el formato es idéntico en las cuatro. Live 9 y 10 probablemente lean la lección (la sintaxis básica es la misma desde 2010), pero no se prueban ni se garantizan; las guías viejas dicen que esas versiones solo mostraban imágenes TIFF. Exportar en TIFF para cubrir versiones viejas queda descartado para v1.
- Lo que se le comunica al docente: **funciona en Live 11 o superior**. Única excepción conocida: Live 12.4.0 a 12.4.4 podían colgarse al arrancar con un Set que tenía una lección asociada (corregido en 12.4.5, según las release notes oficiales). Quien esté en esas versiones tiene que actualizar a la última 12.4.
- Live elige el archivo según el idioma de SU interfaz. Son siete idiomas: `LessonsEN.txt`, `LessonsES.txt`, `DE`, `FR`, `IT`, `JA` y `ZH` (chino simplificado, presente en las lecciones que trae Live 12). Si falta el del idioma del alumno, no ve nada. Por eso la app escribe el contenido en los siete idiomas por defecto.
- Imágenes: PNG de **260 px de ancho como máximo**, con una copia opcional al doble (520 px, mismo nombre de archivo) en la subcarpeta `Large/`. Probado en Fase 0: Live no achica las imágenes más anchas (quedan cortadas), y JPG y GIF no se muestran (aparece el nombre del archivo como texto). En Live 11 se confirmó que usa la copia de `Large/` con el zoom de interfaz por encima de 100 %.
- Formatos que Live muestra (Fase 0): negrita, cursiva, viñetas, líneas en negrita como títulos, imágenes PNG, línea divisoria, links a otras páginas y links a `https://`. Los links `http://` no abrieron nada.
- Save As con otro nombre no copia la carpeta de la lección: el set nuevo abre sin lección. Collect All and Save no toca las lecciones.

## Fase 0 — Investigación (antes de escribir código)

La documentación pública de la sintaxis es de foros viejos. No te bases en eso; sacala de la fuente:

1. Buscá en la Mac todos los `Lessons*.txt` que trae Live y los Packs instalados (bundle de la app en `Contents/App-Resources/`, la User Library, las carpetas de Packs). Extraé la sintaxis real: títulos, negritas, listas, separadores, imágenes, todos los tipos de `$Link` (a página, a set, al browser, a URL externa).
2. Probá en Live 12.4.7 y repetí lo esencial (que la lección aparezca, imágenes PNG, negrita, cursiva, viñetas y links) en Live 11.3, con el proyecto de prueba y usando el control de la compu:
   - Acentos, ñ, ¿¡ y comillas tipográficas (ya hay una línea de prueba en `test Lessons`).
   - Links a URL externa (YouTube). Es requisito de v1 si Live lo soporta.
   - Ancho máximo de imagen y formatos aceptados: confirmar PNG a 260 px con la copia de 520 px en `Large/`, y qué pasa con imágenes más anchas, JPG y GIF.
   - Cada elemento de sintaxis encontrado en el punto 1.
3. Sacá capturas de cómo se ve la lección propia en Live 12.4.7. **El editor tiene que imitar esto**, no la portada de la Learn View de Ableton, que es contenido propio con videos y filtros que nuestro formato no puede hacer.

Entregable: un `docs/formato.md` con la sintaxis soportada (probada / no probada) y las capturas de referencia. Mostrámelo antes de seguir.

## Alcance v1

Lo más funcional posible sin complejizar la app.

- **El editor es el preview.** Se escribe directamente sobre una réplica de cómo se ve la lección en Live: mismo ancho de panel, estilo, colores y botones de navegación entre páginas. La fuente de Ableton es propietaria; usá Jost (Google Fonts), que es la alternativa libre más cercana.
- **Interfaz mínima**, centrada en el panel de Live (diseño de referencia: https://claude.ai/artifact/Pqcg8jZ1uCjEPrLNEM2kHe). Fijos en pantalla solo están el logo, el botón de lecciones (carpeta: nueva / abrir) y Exportar. El título de la página se edita en la cabecera del panel; las páginas se navegan con los botones del panel y se administran tocando "1 / N"; el formato aparece al seleccionar texto o en una línea vacía. Lo que se exporta se muestra solo al pasar el mouse por Exportar.
- Solo se pueden aplicar los formatos que Live soporta (según `docs/formato.md`): negrita, cursiva, viñetas, imágenes, línea divisoria y links. Nada de opciones que después no se vean en Live.
- Páginas: agregar, quitar, reordenar y renombrar.
- **Pegar con formato** desde Google Docs y Notion, convirtiendo a lo que Live soporte y descartando el resto.
- Imágenes por arrastrar, elegir archivo o pegar (Cmd/Ctrl+V, clave para capturas de Ableton). Se convierten siempre a PNG (también JPG, GIF, etc., que Live no muestra) y se exportan en dos tamaños: 260 px de ancho en la carpeta de la lección y 520 px en `Large/` (si la imagen original es más chica, no se agranda).
- Links entre páginas y a URLs externas (confirmados en Fase 0, incluido YouTube). Solo `https://`: si el docente pega un link `http://`, la app lo pasa a `https://`.
- **Link a email** (`mailto:`): el docente escribe la dirección y la app arma el link.
- **Link a otro Set** (`Set:`): v1 se piensa para un único `.als`, pero la lección puede abrir otro Set del mismo proyecto. El docente escribe el nombre del Set destino (por ejemplo "Ejercicio 2") y la app agrega `.als` si falta (probado: sin la extensión Live da error). La app no puede verificar que exista: escribirlo bien es responsabilidad del docente. Si no existe, Live solo muestra un aviso de error. En el diálogo del link se muestra el aviso: "El Set tiene que estar en la misma carpeta del proyecto y el nombre tiene que coincidir exactamente."
- **Lo que la app no edita se conserva.** Al abrir una lección, todo elemento que el editor no ofrece (links `Pref:`, `Browse…`, `$If`, etc.) se muestra como un bloque gris no editable, que se puede mover o borrar, y se exporta tal cual.
- **Exportar `.zip`**: el zip se llama `[Nombre del set] Lessons.zip` y contiene la carpeta `[Nombre del set] Lessons/` con los siete `.txt` (UTF-8 sin BOM, LF), las imágenes y la subcarpeta `Large/`. La app pide el nombre del set una sola vez, la primera vez que se exporta: se escribe, o se arrastra el `.als` para tomar el nombre exacto (solo se lee el nombre del archivo, no se sube nada).
- **Instrucciones en pantalla** después de descargar: dónde descomprimir, cómo debe quedar la estructura y cómo abrir la lección. Son las mismas para Mac y Windows: abrir el zip y arrastrar la carpeta de adentro al proyecto. Esa redacción evita el problema de Windows con "Extraer todo", que crea `X Lessons/X Lessons` y Live no lo lee. Aclará que cada `.als` lleva su propia lección (para otro set, se arma otra lección y se exporta aparte), que si se renombra el set o se hace Save As hay que renombrar o duplicar la carpeta de la lección, que si la lección tiene links a otros Sets esos Sets tienen que estar en el mismo proyecto (y si se les cambia el nombre, el link deja de funcionar), que funciona en Live 11 o superior y avisá lo de 12.4.0–12.4.4.
- **Editar una lección existente**: arrastrar la carpeta `Lessons` a la app y que la abra. Leer carpetas arrastradas funciona en todos los navegadores.
  - Si los `Lessons<IDIOMA>.txt` de la lección tienen textos distintos entre sí, la app avisa ("Esta lección tiene textos distintos por idioma, ¿cuál editás?") y deja elegir cuál abrir. Al exportar, avisa que las traducciones se reemplazan por el texto editado.
- Borrador guardado automáticamente en el navegador (incluidas las imágenes). Se trabaja **una lección a la vez**.
- Interfaz en español e inglés, con un selector **ES · EN** en el footer (en el celular, debajo del panel). Arranca en el idioma del navegador y recuerda la elección. Solo cambia los textos de la app, no el contenido de la lección.
- **Funciona bien en el celular**, con una interfaz simple y moderna. Referencia de diseño (pantallas de escritorio y de celular): https://claude.ai/artifact/Pqcg8jZ1uCjEPrLNEM2kHe
  - El panel de la lección se muestra a tamaño real y la barra de formato queda pegada arriba del teclado, con botones de al menos 44 px.
  - Las páginas se manejan desde un panel que sube desde abajo: reordenar manteniendo apretado y arrastrando, agregar, renombrar y borrar.
  - Imágenes desde la cámara, la galería o pegando una captura.
  - Exportar descarga el mismo `.zip`. En el celular no se puede arrastrar una carpeta, así que para editar una lección existente se elige el `.zip` desde Archivos.

## Fuera de alcance (v2, no implementar)

- Traducción automática ES↔EN (requiere una API con clave y un backend).
- Búsqueda de imágenes en Unsplash o Pexels (mismo problema de clave).
- Links que abren carpetas del browser de Live.
- Arrastrar el proyecto entero a la app para elegir los Sets de una lista (para los links a otro Set).
- Lista de lecciones guardadas en el navegador (una por set), para pasar de una a otra sin exportar.
- Escribir directo en la carpeta del proyecto. Se descartó: solo funciona en Chrome y Edge, y el zip es el flujo único.

## Técnica

- Sitio estático, sin backend, sin login. Nada sale de la compu del usuario.
- Recomendado: Vite + TypeScript. Editor sobre TipTap/ProseMirror, restringido a los formatos soportados (resuelve el pegado desde Docs/Notion). JSZip para el zip. Redimensionado de imágenes con canvas. Borradores en IndexedDB.
- **El núcleo es el parser y el serializador del formato `Lessons*.txt`.** Tienen que hacer round-trip sin pérdida (cargar → guardar → idéntico). Cubrilos con tests (Vitest), incluyendo los archivos reales encontrados en Fase 0.
- Deploy en GitHub Pages.

## Marca

- Nombre: **DFX Live Lessons**.
- Logo: `assets/brand/dfx-logo.svg` (copiado de `dfx vector.svg` en Google Drive, carpeta `Media / DFX`). Es el único asset de marca que se usa; las carpetas `png` y `background` de Drive no.
- El logo es blanco, sin color. La paleta de la app parte de ahí (fondo oscuro, logo y texto blancos); si hace falta un color de acento, proponémelo.
- Licencia MIT para el código. El logo queda fuera de la licencia.
- En el footer y en el README: "No está afiliado ni respaldado por Ableton".
- Footer: "Gratis y open source", link a GitHub y link a Cafecito https://cafecito.app/nickomz.
- La marca DFX vive en la interfaz de la app, nunca dentro de la lección exportada: la lección es del docente.

## Criterios de terminado (v1)

1. Una lección de 3+ páginas, con texto con formato, imagen pegada y links, creada en la app, exportada y descomprimida, se ve en Live 12.4.7 igual que en el editor, y también se abre bien en Live 11.3. Verificalo vos con el control de la compu y mostrame capturas lado a lado.
2. Esa lección, arrastrada de vuelta a la app, se abre idéntica.
3. Pegar desde un Google Doc con títulos, negritas y listas conserva lo que Live soporta. Como el formato de Live no tiene títulos, cada título pegado se convierte en una línea en negrita (igual que hace Ableton en sus lecciones).
4. Funciona en Chrome, Safari y Firefox de escritorio, y en Safari (iPhone) y Chrome (Android): se puede crear una lección de punta a punta desde el celular.
5. Un docente sin explicación previa puede crear y colocar su primera lección.
