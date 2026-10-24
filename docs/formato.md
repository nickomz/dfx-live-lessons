# Formato de las lecciones de Live

Referencia de lo que Live realmente muestra en una lección por proyecto. Sale de la **Fase 0**: pruebas hechas el 24/10/2026 en **Live 12.4.7** y **Live 11.3.43** (Mac), con la lección de prueba guardada en [`docs/pruebas/test Lessons/`](pruebas/test%20Lessons/) y las capturas en [`docs/capturas/`](capturas/).

El editor solo ofrece lo que figura como **Funciona**.

## Carpeta y archivos

```
Mi Set Project/
├── Mi Set.als
└── Mi Set Lessons/
    ├── LessonsES.txt  (+ EN, DE, FR, IT, JA, ZH)
    ├── imagen.png
    └── Large/
        └── imagen.png   (copia al doble de tamaño, opcional)
```

| Regla | Estado | Detalle |
|---|---|---|
| Carpeta = nombre del set + ` Lessons` | Probado | Un set guardado con otro nombre (Save As) abre sin lección: Live muestra "Pack Overview" en su lugar. |
| Archivo por idioma `Lessons<IDIOMA>.txt` | Probado | Se escribieron los 7 con el mismo contenido. |
| UTF-8 sin BOM, saltos LF | Probado | Es lo que escribe la app. |
| Archivo con BOM | Probado | Live lo lee igual, sin problemas. |
| Saltos de línea de Windows (CRLF) | Probado | Live lo lee igual, imágenes incluidas. |

## Sintaxis

| Elemento | Cómo se escribe | Live 12.4.7 | Live 11.3 |
|---|---|---|---|
| Página | `$Page Título` + `$TargetName id` | Funciona. El título aparece en la cabecera del panel. | Funciona |
| Párrafo | texto, separado por línea en blanco | Funciona | Funciona |
| Negrita | `*texto*` | Funciona, también en medio de una frase | Funciona |
| Cursiva | `/texto/` | Funciona, también en medio de una frase | Funciona |
| "Título" | línea entera en `*negrita*` | Funciona (no hay títulos reales) | Funciona |
| Viñeta | `-> texto` al inicio de línea | Funciona: Live dibuja un `•` | Funciona |
| Barra suelta | `Pads/texturas`, `1/4` | Funciona: una sola barra no se toma como cursiva | Funciona |
| Acentos, ñ, ¿¡, comillas tipográficas, raya | texto normal | Funciona | Funciona |
| Línea divisoria | línea con `Divider.tif` | Funciona (recurso interno de Live, no lleva archivo) | Funciona |
| Comentario | `$Comment ...` | Funciona: no se ve | Funciona |

## Imágenes

| Caso | Live 12.4.7 | Live 11.3 |
|---|---|---|
| PNG de 260 px de ancho | Funciona: ocupa el ancho del panel | Funciona |
| Copia 2x en `Large/` (520 px, mismo nombre) | No probado: la pantalla de prueba no es Retina y no pude mover Live a la Retina | Funciona: con el zoom de interfaz de Live por encima de 100 %, Live usa la de `Large/` a tamaño 260 |
| PNG más ancho (400 px) | **No se achica: queda cortada** a la derecha | Igual, cortada |
| JPG | **No funciona**: muestra el nombre del archivo como texto | No funciona |
| GIF | **No funciona**: muestra el nombre del archivo como texto | No funciona |

Conclusión para la app: toda imagen se convierte a **PNG de 260 px de ancho** (más la copia de 520 px en `Large/`). Nunca se exporta JPG, GIF ni una imagen más ancha.

## Links

| Caso | Cómo se escribe | Live 12.4.7 | Live 11.3 |
|---|---|---|---|
| A otra página | `$Link texto <GotoPage:id>` | Funciona | Funciona |
| A una web con https | `$Link texto <https://...>` | Funciona: abre el navegador del sistema | Funciona |
| A YouTube | `$Link texto <https://www.youtube.com/...>` | Funciona: abre el navegador | No probado (mismo mecanismo que https) |
| A una web con http | `$Link texto <http://...>` | **No abrió nada** | No probado |
| Link con texto en negrita | `$Link *texto* <...>` | Funciona | No probado |
| Imagen como link | `$Link imagen.png <...>` | Funciona: clic en la imagen | No probado |
| A un email | `$Link texto <mailto:nombre@dominio.com>` | Funciona: abre el programa de correo predeterminado (en la Mac de prueba, Chrome) | Funciona |
| A otro Set del proyecto | `$Link texto <Set:Ejercicio 2.als>` | Funciona: Live abre ese Set. Si el Set no tiene lección propia, el panel sigue mostrando la lección anterior | Funciona |
| A otro Set sin `.als` | `$Link texto <Set:Ejercicio 2>` | **No funciona**: error "Failed to resolve the link to Set:Ejercicio 2." | No funciona, mismo error |
| A un Set que no existe | `$Link texto <Set:No existe.als>` | Error "Failed to resolve the link to Set:No existe.als."; Live sigue con el set abierto, no se cuelga | Igual |

Los links se ven subrayados. Conclusión para la app: links a páginas y a `https://`. Si el docente pega un link `http://`, se pasa a `https://`. Links `mailto:` y `Set:` también (probados el 24/10/2026 con un Set "Ejercicio 2" en la misma carpeta del proyecto). En `Set:` la app **siempre** agrega `.als`: sin la extensión, Live da error. Si el Set no existe, Live solo muestra un aviso.

## Cómo se ve el panel

Lo que el editor tiene que imitar (ver capturas):

- **Cabecera:** cerrar (✕), el título de la página actual y, a la derecha, inicio y flechas ‹ ›. En Live 12 son celdas separadas; en Live 11, botones redondos.
- **Pie:** a la izquierda "Return" en la primera página y "Previous Page" en las demás. En el centro "N / total". A la derecha "Next Page", que en la última página pasa a "Finish" (desactivado).
- **Live 12.4.7:** fondo gris medio y texto blanco. Con el zoom de interfaz al 100 %, el panel mide unos 288 px de ancho por dentro.
- **Live 11.3:** fondo más oscuro, la misma tipografía y los mismos botones de pie.

| Captura | Qué muestra |
|---|---|
| [live12-01-formato.png](capturas/live12-01-formato.png) | Formato de texto, viñetas, acentos, divisor (Live 12) |
| [live12-02-imagenes.png](capturas/live12-02-imagenes.png) | PNG 260, PNG 400 cortada, JPG y GIF como texto (Live 12) |
| [live12-03-links.png](capturas/live12-03-links.png) | Links e imagen como link (Live 12) |
| [live12-04-final.png](capturas/live12-04-final.png) | Última página con "Finish" (Live 12) |
| [live12-05-save-as-sin-leccion.png](capturas/live12-05-save-as-sin-leccion.png) | Set con otro nombre: sin lección, "Pack Overview" (Live 12) |
| [live11-01-formato.png](capturas/live11-01-formato.png) | Formato de texto (Live 11) |
| [live11-02-imagenes.png](capturas/live11-02-imagenes.png) | Imagen de `Large/` en uso (Live 11) |
| [live11-03-links.png](capturas/live11-03-links.png) | Links (Live 11) |
| [live12-06-links-email-set.png](capturas/live12-06-links-email-set.png) | Links a email y a otro Set (Live 12) |
| [live12-07-set-sin-als-error.png](capturas/live12-07-set-sin-als-error.png) | Error con un link `Set:` sin `.als` (Live 12) |
| [live12-08-set-inexistente-error.png](capturas/live12-08-set-inexistente-error.png) | Error con un Set que no existe (Live 12) |
| [live11-04-set-inexistente-error.png](capturas/live11-04-set-inexistente-error.png) | Error con un Set que no existe (Live 11) |

## Comportamiento de Live con la carpeta de la lección

| Acción | Resultado |
|---|---|
| Save As con otro nombre | No copia ni renombra la carpeta `… Lessons`. El set nuevo abre sin lección. |
| Collect All and Save | Solo ofrece copiar archivos de audio y media; no menciona las lecciones. La carpeta, que ya está en el proyecto, no se toca. (Se canceló antes de copiar nada.) |

Para las instrucciones de la app: si el docente renombra el set o hace Save As, tiene que renombrar o duplicar la carpeta de la lección a mano.

## Pendiente

- **Sin internet:** no se pudo confirmar. En el intento, internet volvió antes de que Live terminara de abrir el set.
- **`Large/` en Live 12 con pantalla Retina:** no probado. En Live 11 funciona, y Ableton lo usa en sus propias lecciones de Live 12.
- **Windows:** no probado (no hay una PC con Live).
- **Live 9 y 10:** no instalados; fuera del alcance (la app soporta Live 11 o superior).
