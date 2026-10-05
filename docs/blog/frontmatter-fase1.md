# Contrato MDX de la Fase 1 (contenido ↔ plataforma)

Borrador de trabajo de SOS-COM para coordinar con PLT la estructura exacta de
los `.mdx` mientras no exista la implementación en `main`. Los artículos de
`content/blog/empresa|producto/` usan **estos campos**; si PLT cambia el
contrato, se ajusta acá y en los ocho artículos de una sola pasada.

## Ruta y nombre

```
content/blog/empresa/AAAA-MM-slug.mdx
content/blog/producto/AAAA-MM-slug.mdx
```

- `AAAA-MM` = mes de publicación (el día exacto vive en `date`).
- `slug` corto, sin prefijo de fecha en la URL pública.
- URL pública (canonical) por blog:

| Blog | Host | Patrón |
|---|---|---|
| Empresa | `blog.scaleparaguay.com` | `/<slug>` |
| Producto | `producto.scaleparaguay.com` | `/<slug>` |

Categorías (etiqueta visible en el artículo, no segmento de URL): empresa
`Servicios · Casos · Cultura · Noticias`; producto `Novedades · Guías · Changelog
· Casos`. El middleware reescribe el host al índice del blog y las URLs de los
posts son `/<slug>`; el H1 lo dibuja la plantilla (el cuerpo no repite `#`).

## Frontmatter

Base acordada en `docs/BLOG-PROPUESTA.md` + extensiones de
`docs/blog/requisitos-plataforma.md`:

| Campo | Tipo | Obligatorio | Qué es |
|---|---|---|---|
| `title` | string (≤ 60) | sí | Título visible; la plantilla lo dibuja como H1 |
| `description` | string (≤ 155) | sí | Meta description / resumen de tarjeta |
| `seoTitle` | string (≤ 60) | no | Título SEO si difiere del visible |
| `date` | fecha `AAAA-MM-DD` | sí | Fecha de publicación (Asunción) |
| `updated` | fecha `AAAA-MM-DD` | no | Fecha de actualización visible |
| `author` | string | sí | Firma (ver «Autores») |
| `categories` | array (1) | sí | Sección del blog |
| `tags` | array (≤ 3) | no | Etiquetas de audiencia/tema |
| `cover` | string | **pendiente** | Ruta de portada 16:9; `""` = sin portada (fallback visual) |
| `coverAlt` | string | **pendiente** | Alt de la portada cuando exista |
| `draft` | boolean | sí | `true` = no indexar/publicar (flujo por PR) |
| `canonical` | string | no | URL canónica del artículo en su host |

Decisiones que le toca cerrar a PLT/DSN:

1. **Portadas**: los artículos van sin imagen (`cover: ""`) hasta que DSN
   defina el set visual. La plantilla debe tolerar el vacío con un fallback de
   marca; cuando exista una portada, `coverAlt` es obligatorio (a11y) y se
   completa junto con `cover`.
2. **Autores**: por ahora `author` es texto (`Dario De Oliveira` en empresa;
   `Equipo de Scale OS` en producto). Si PLT implementa entidad de autor
   (bio/foto/rol), el frontmatter pasa a `authors: [slug]` con un directorio
   `content/blog/autores`.
3. **`draft: false`** habilita la publicación solo cuando `date` ya llegó en
   `America/Asuncion`. Hasta entonces, el artículo no aparece en el índice, su URL
   directa, RSS ni sitemap. Las rutas permitidas, RSS y sitemap se fijan en el build;
   una URL nueva se habilita en el primer build ejecutado en esa fecha o después.
   El índice y detalle con chrome de analítica validan además cada solicitud.
   `includeDrafts: true` conserva el acceso editorial a borradores y programados.
4. **Cross-blog**: no se agrega campo; los enlaces van en el cuerpo con UTM
   (`utm_source=blog-scale|blog-producto&utm_medium=cross`).

Notas del contrato que valida `tests/blog-content-156-157.test.ts`:

- **`canonical` es opcional** (`canonical?` en `docs/BLOG-PROPUESTA.md`): el
  render puede derivarla del host y el slug; si un artículo la declara, debe
  pertenecer al host del blog y terminar en su slug.
- El test corre en dos capas: contrato de plataforma sobre **todos** los
  `.mdx` (campos base, fecha/nombre, canonical opcional, alt con portada y un
  solo H1) y reglas editoriales sobre los **ocho artículos de la ronda**
  (límites SEO, taxonomía, hasta 3 etiquetas, extensión, CTA y enlaces).

## Cuerpo

- Sin H1 (lo pone la plantilla): empezar por la entradilla y seguir con `##`/`###`.
- Párrafos de 2–4 líneas, listas para pasos, negritas para la idea a retener.
- Enlaces internos contextuales (2–3) y **un solo CTA** al final, según el blog:
  - Empresa → análisis gratuito (`scaleparaguay.com/#contacto` o WhatsApp).
  - Producto → demo (`sistema.scaleparaguay.com/demo`) y registro.
- Nada de datos de clientes, casos reales ni cifras sin fuente: eso vive en
  `draft: true` hasta la aprobación del dueño.
