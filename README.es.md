# DFX Live Lessons

[English](README.md)

App web gratuita y open source para escribir **lecciones que aparecen dentro de Ableton Live** al abrir un proyecto. Pensada para docentes de producción musical que quieren dejarle a sus alumnos instrucciones, capturas y links directamente adentro del set.

**Usala acá: https://nickomz.github.io/dfx-live-lessons/**

## Qué hace

Live puede mostrar una lección propia en un panel al costado del set: páginas con texto, imágenes y links. El formato existe desde hace años, pero Ableton nunca lo documentó y armarlo a mano es engorroso. DFX Live Lessons te deja escribir la lección viendo cómo va a quedar en Live, y te da el archivo listo para usar.

- **Escribís sobre una réplica del panel de Live.** Lo que ves es lo que va a ver tu alumno.
- **Solo ofrece lo que Live muestra:** negrita, cursiva, viñetas, imágenes, líneas divisorias y links (a otras páginas, a webs, a un email o a otro Set del mismo proyecto).
- **Pegás desde Google Docs o Notion** y convierte el formato a lo que Live entiende.
- **Imágenes por arrastrar, elegir o pegar** (ideal para capturas de Ableton). Se ajustan solas al tamaño correcto.
- **Exporta en los 7 idiomas de Live** con el mismo contenido, así la lección aparece sin importar en qué idioma use Live tu alumno.
- **Funciona en la compu y en el celular.**

## Cómo usarlo

1. Abrí la app y elegí **Nueva lección**.
2. Armá las páginas: texto, imágenes y links.
3. Tocá **Exportar** y escribí el nombre de tu set, tal cual se llama el archivo `.als` (sin la extensión).
4. Descomprimí el zip y mové la carpeta `[Nombre del set] Lessons` adentro de la carpeta del proyecto, al lado del `.als`:

   ```
   Mi Set Project/
   ├── Mi Set.als
   └── Mi Set Lessons/
       ├── LessonsES.txt   (y los otros idiomas)
       ├── imagen.png
       └── Large/
   ```

5. Abrí el set en Live. La lección aparece sola.

Para **editar una lección que ya tenés**, arrastrá a la app la carpeta `… Lessons` o su `.zip`, o usá **Abrir** (en el celular, elegí el `.zip` desde Archivos).

**Importante:** el nombre de la carpeta tiene que ser el del set más ` Lessons`. Cada `.als` lleva su propia lección. Si renombrás el set o hacés Save As, renombrá o duplicá también la carpeta.

## Compatibilidad

- **Live 11 o superior.**
- Si usás Live 12.4.0 a 12.4.4, actualizá a la última 12.4: esas versiones podían colgarse al abrir un set con lección.

## Privacidad

Todo pasa en tu navegador. No hay cuentas, no hay servidor y nada de lo que escribís sale de tu compu. El borrador se guarda en el navegador para que no pierdas el trabajo.

## Sugerencias

¿Encontraste un error o tenés una idea? Usá **Sugerencias** en el pie de la app. Lleva un minuto y ayuda a decidir qué viene después.

## Desarrollo

Requiere Node 24 o superior.

```bash
npm install
npm test
```

`npm test` corre las pruebas del motor que lee y escribe las lecciones. En una Mac con Live instalado, también verifica todas las lecciones de Live y de los Packs (sin copiarlas al repo).

## Documentación del proyecto

- [`docs/BRIEF.md`](docs/BRIEF.md): qué se construye, alcance y criterios de terminado.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): etapas del desarrollo y qué viene después.
- [`docs/formato.md`](docs/formato.md): el formato de las lecciones, probado en Live 12.4.7 y 11.3.

## Apoyar el proyecto

Es gratis y lo va a seguir siendo. Si te sirve, podés [invitarme un cafecito](https://cafecito.app/nickomz).

## Licencia

Código bajo licencia [MIT](LICENSE): podés usarlo, modificarlo y compartirlo libremente. El logo de DFX no está incluido en esa licencia.

DFX Live Lessons es un proyecto independiente. No está afiliado ni respaldado por Ableton. Ableton y Live son marcas de Ableton AG.
