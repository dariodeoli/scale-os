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
| Empresa | `blog.scaleparaguay.com` | `/{categoria}/{slug}` |
| Producto | `producto.scaleparaguay.com` | `/{categoria}/{slug}` |

Categorías válidas: empresa `servicios · casos · cultura · noticias`; producto
`novedades · guias · changelog · casos`.

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
   marca; cuando existan assets, se completan `cover` y `coverAlt`.
2. **Autores**: por ahora `author` es texto (`Dario De Oliveira` en empresa;
   `Equipo de Scale OS` en producto). Si PLT implementa entidad de autor
   (bio/foto/rol), el frontmatter pasa a `authors: [slug]` con un directorio
   `content/blog/autores`.
3. **`draft: false`** solo significa “contenido listo para revisar en el PR”;
   la publicación real ocurre cuando el PR integra, como cualquier release.
4. **Cross-blog**: no se agrega campo; los enlaces van en el cuerpo con UTM
   (`utm_source=blog-scale|blog-producto&utm_medium=cross`).

## Cuerpo

- Sin H1 (lo pone la plantilla): empezar por la entradilla y seguir con `##`/`###`.
- Párrafos de 2–4 líneas, listas para pasos, negritas para la idea a retener.
- Enlaces internos contextuales (2–3) y **un solo CTA** al final, según el blog:
  - Empresa → análisis gratuito (`scaleparaguay.com/#contacto` o WhatsApp).
  - Producto → demo (`sistema.scaleparaguay.com/demo`) y registro.
- Nada de datos de clientes, casos reales ni cifras sin fuente: eso vive en
  `draft: true` hasta la aprobación del dueño.
