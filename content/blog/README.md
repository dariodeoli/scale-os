# Blog — guía para autores

Contenido en Markdown (archivos `.mdx`) con frontmatter. Sin CMS: se publica por
PR y el deploy lo hace el release normal. El contrato de plataforma se valida en
build (`app/blog-data.ts`) y lo cubren `tests/blog-156.test.ts` y el test de
contenido de COM.

## Estructura y URLs

```
content/blog/empresa/AAAA-MM-slug.mdx    → https://blog.scaleparaguay.com/<slug>
content/blog/producto/AAAA-MM-slug.mdx   → https://producto.scaleparaguay.com/<slug>
```

- El archivo empieza con el mes de publicación (`AAAA-MM-slug.mdx`); el día va en `date`.
- La **URL pública no lleva categoría**: es `https://<host>/<slug>`, con el slug
  del archivo **sin** el prefijo `AAAA-MM-`.

## Frontmatter

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `title` | string | sí | Título visible (la plantilla lo dibuja como H1) |
| `description` | string | sí | Meta description / resumen de tarjeta |
| `seoTitle` | string ≤60 | no | Título SEO si difiere del visible |
| `date` | `AAAA-MM-DD` | sí | Fecha de publicación |
| `updated` | `AAAA-MM-DD` | no | Fecha de actualización |
| `author` | string | sí | Firma |
| `categories` | array (1) | sí | Categoría por **nombre visible** o slug |
| `tags` | array (≤3) | no | Etiquetas |
| `cover` | string | no | Portada (ruta local o URL https); `""` = sin portada |
| `coverAlt` | string | con portada | Alt de la portada (a11y, mínimo 4 caracteres) |
| `draft` | boolean | sí | `true` = no se publica ni indexa (404) |
| `canonical` | string | no | Si se declara, debe ser exactamente `https://<host>/<slug>`; si falta, la plantilla y el sitemap la derivan |

## Publicación programada

- `draft: true` mantiene el artículo fuera del índice, la URL directa, RSS y sitemap.
- `draft: false` con una `date` futura programa el artículo: esas mismas superficies
  permanecen embargadas hasta esa fecha civil en `America/Asuncion`.
- Como los blogs se generan de forma estática, el artículo aparece en el primer build
  ejecutado en su fecha de publicación o después. Cambiar el reloj no publica un build
  ya desplegado: hace falta un nuevo build/deploy.
- Las herramientas editoriales que usan `includeDrafts: true` siguen viendo borradores
  y publicaciones programadas para revisión.

Categorías (nombre visible → slug interno):
- **empresa**: Servicios · Casos · Cultura · Noticias.
- **producto**: Novedades · Guías · Changelog · Casos.

## Cuerpo (reglas editoriales)

- **Sin H1** (lo dibuja la plantilla); al menos un `##`.
- Párrafos de 2–4 líneas, listas para pasos, negritas para la idea a retener.
- Enlaces internos contextuales y un CTA al final: empresa →
  `https://wa.me/595993391354` o `https://scaleparaguay.com/#contacto`;
  producto → `https://sistema.scaleparaguay.com/demo`.
- Cross-blog con `?utm_medium=cross` en al menos un artículo por blog.
- Fase 1 no acepta imports/JSX dentro del contenido; si hace falta, se incorpora
  `@next/mdx` sin mover los archivos.
