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
- Codificación: todos los `Lessons*.txt` que trae Live son UTF-8 sin BOM, con saltos de línea LF (ninguno usa CRLF). La app escribe siempre así; un BOM pondría bytes antes de `$Page`.
- **Probado y funcionando en Live 12.4.7 (Mac)**: Live 12.4 reemplazó la Help View por la Learn View, pero las lecciones por proyecto siguen cargando. Hay un proyecto de prueba en `~/Desktop/test Project`.
- Versión mínima recomendada: **Live 12.4.5**. Esa versión corrigió un crash al arrancar con un Set que tenía una lección asociada (release notes oficiales de Live 12). El formato es el mismo desde Live 11.3, así que las versiones anteriores deberían leerlo, pero no está probado.
- Live elige el archivo según el idioma de SU interfaz. Son siete idiomas: `LessonsEN.txt`, `LessonsES.txt`, `DE`, `FR`, `IT`, `JA` y `ZH` (chino simplificado, presente en las lecciones que trae Live 12). Si falta el del idioma del alumno, no ve nada. Por eso la app escribe el contenido en los siete idiomas por defecto.
- Imágenes: las lecciones de Ableton usan PNG de **260 px de ancho como máximo**, con una copia opcional al doble (hasta 520 px, mismo nombre de archivo) en la subcarpeta `Large/` para pantallas Retina. El TIFF que piden las guías viejas ya no hace falta. No hay evidencia de que JPG o GIF funcionen. (Sale de los archivos de Live y los Packs instalados; falta verlo en pantalla en Fase 0.)

## Fase 0 — Investigación (antes de escribir código)

La documentación pública de la sintaxis es de foros viejos. No te bases en eso; sacala de la fuente:

1. Buscá en la Mac todos los `Lessons*.txt` que trae Live y los Packs instalados (bundle de la app en `Contents/App-Resources/`, la User Library, las carpetas de Packs). Extraé la sintaxis real: títulos, negritas, listas, separadores, imágenes, todos los tipos de `$Link` (a página, a set, al browser, a URL externa).
2. Probá en Live 12.4.7, con el proyecto de prueba y usando el control de la compu:
   - Acentos, ñ, ¿¡ y comillas tipográficas (ya hay una línea de prueba en `test Lessons`).
   - Links a URL externa (YouTube). Es requisito de v1 si Live lo soporta.
   - Ancho máximo de imagen y formatos aceptados: confirmar PNG a 260 px con la copia de 520 px en `Large/`, y qué pasa con imágenes más anchas, JPG y GIF.
   - Cada elemento de sintaxis encontrado en el punto 1.
3. Sacá capturas de cómo se ve la lección propia en Live 12.4.7. **El editor tiene que imitar esto**, no la portada de la Learn View de Ableton, que es contenido propio con videos y filtros que nuestro formato no puede hacer.

Entregable: un `docs/formato.md` con la sintaxis soportada (probada / no probada) y las capturas de referencia. Mostrámelo antes de seguir.

## Alcance v1

Lo más funcional posible sin complejizar la app.

- **El editor es el preview.** Se escribe directamente sobre una réplica de cómo se ve la lección en Live: mismo ancho de panel, estilo, colores y botones de navegación entre páginas. La fuente de Ableton es propietaria; usá Jost (Google Fonts), que es la alternativa libre más cercana.
- Solo se pueden aplicar los formatos que Live soporta (lo define la Fase 0). Nada de opciones que después no se vean en Live.
- Páginas: agregar, quitar, reordenar y renombrar.
- **Pegar con formato** desde Google Docs y Notion, convirtiendo a lo que Live soporte y descartando el resto.
- Imágenes por arrastrar, elegir archivo o pegar (Cmd/Ctrl+V, clave para capturas de Ableton). Se convierten a PNG y se exportan en dos tamaños: 260 px de ancho en la carpeta de la lección y 520 px en `Large/` (si la imagen original es más chica, no se agranda).
- Links entre páginas y a URLs externas (si Fase 0 confirma que funcionan).
- **Exportar `.zip`**: el zip se llama `[Nombre del set] Lessons.zip` y contiene la carpeta `[Nombre del set] Lessons/` con los siete `.txt` (UTF-8 sin BOM, LF), las imágenes y la subcarpeta `Large/`. La app pide el nombre del set una sola vez.
- **Instrucciones en pantalla** después de descargar: dónde descomprimir, cómo debe quedar la estructura y cómo abrir la lección. Contemplá el problema de Windows: "Extraer todo" crea por defecto una carpeta con el nombre del zip y queda `X Lessons/X Lessons`, que Live no lee. Recomendá Live 12.4.5 o superior.
- **Editar una lección existente**: arrastrar la carpeta `Lessons` a la app y que la abra. Leer carpetas arrastradas funciona en todos los navegadores.
- Borrador guardado automáticamente en el navegador (incluidas las imágenes).
- Interfaz en español e inglés.

## Fuera de alcance (v2, no implementar)

- Traducción automática ES↔EN (requiere una API con clave y un backend).
- Búsqueda de imágenes en Unsplash o Pexels (mismo problema de clave).
- Links que cargan otro set o abren carpetas del browser de Live.
- Escribir directo en la carpeta del proyecto. Se descartó: solo funciona en Chrome y Edge, y el zip es el flujo único.

## Técnica

- Sitio estático, sin backend, sin login. Nada sale de la compu del usuario.
- Recomendado: Vite + TypeScript. Editor sobre TipTap/ProseMirror, restringido a los formatos soportados (resuelve el pegado desde Docs/Notion). JSZip para el zip. Redimensionado de imágenes con canvas. Borradores en IndexedDB.
- **El núcleo es el parser y el serializador del formato `Lessons*.txt`.** Tienen que hacer round-trip sin pérdida (cargar → guardar → idéntico). Cubrilos con tests (Vitest), incluyendo los archivos reales encontrados en Fase 0.
- Deploy en GitHub Pages.

## Marca

- Nombre: **DFX Live Lessons**.
- Assets en Google Drive, carpeta `Media / DFX` (id `1LZ6eRMFqOpkejKOSA9hIK1Apwgs-Sw68`): `dfx vector.svg` (logo) y subcarpetas `png` y `background`. Si no tenés acceso a Drive desde acá, pedime que los copie al repo.
- No encontré colores definidos por escrito: tomalos del logo y proponémelos.
- Footer: "Gratis y open source", link a GitHub y link a Cafecito https://cafecito.app/nickomz.
- La marca DFX vive en la interfaz de la app, nunca dentro de la lección exportada: la lección es del docente.

## Criterios de terminado (v1)

1. Una lección de 3+ páginas, con texto con formato, imagen pegada y links, creada en la app, exportada y descomprimida, se ve en Live 12.4.7 igual que en el editor. Verificalo vos con el control de la compu y mostrame capturas lado a lado.
2. Esa lección, arrastrada de vuelta a la app, se abre idéntica.
3. Pegar desde un Google Doc con títulos, negritas y listas conserva lo que Live soporta.
4. Funciona en Chrome, Safari y Firefox.
5. Un docente sin explicación previa puede crear y colocar su primera lección.
