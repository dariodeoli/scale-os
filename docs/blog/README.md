# Propuesta editorial de blogs (Scale Paraguay · Scale OS)

Documentación de la propuesta editorial y del **contenido inicial** de los
blogs (issues [#156](https://github.com/dariodeoli/scale-os/issues/156) y
[#157](https://github.com/dariodeoli/scale-os/issues/157)). La propuesta está
aprobada y la Fase 1 MDX ya tiene sus primeros artículos en `content/blog/`.

## Documentos

| Archivo | Issue | Qué contiene |
|---|---|---|
| [`156-scale-paraguay.md`](156-scale-paraguay.md) | #156 | Blog de la empresa: categorías, autores, plantillas, calendario, 10 títulos con intención/keyword, tono y CTAs hacia Scale OS |
| [`157-scale-os.md`](157-scale-os.md) | #157 | Blog de producto: series (novedades, guías, casos), 12 títulos, cross-linking con Scale Paraguay |
| [`requisitos-plataforma.md`](requisitos-plataforma.md) | #156/#157/#158 | Requisitos de contenido para la plataforma y el SEO técnico (autores, imágenes, on-page, feed, flujo editorial) |
| [`frontmatter-fase1.md`](frontmatter-fase1.md) | #156/#157 | Contrato MDX usado por los artículos (campos, rutas y pendientes para PLT/DSN) |
| [`contenido-inicial.md`](contenido-inicial.md) | #156/#157 | Inventario de los 8 artículos iniciales con intención de búsqueda y estado |

Los artículos viven en `content/blog/empresa/` y `content/blog/producto/`, con
el contrato validado por `tests/blog-content-156-157.test.ts` (cadena de
regresión).

## Reglas de la propuesta

- **Dos blogs separados** (default confirmado en #156): identidad, dominio,
  canonical y CTA propios; se enlazan con contexto, no se intercambian por SEO.
- **Fuente única de datos**: propuestas, precios y tono salen de la web vigente
  (`public/scale-os.html` y `scaleparaguay.com`) y de `docs/NOVEDADES.md`; no se
  inventan cifras, clientes ni resultados.
- **Voces distintas**: Scale Paraguay le habla a marcas (profesionales, marca
  personal, empresas) y vende el servicio; Scale OS le habla a agencias y vende
  el producto. El puente es deliberado y escaso (máx. 1 enlace cruzado por
  artículo).
- Nada se publica hasta la aprobación del dueño; la plataforma la define PLT
  (ver requisitos), no esta propuesta. La capa editorial se alinea con la
  propuesta de plataforma de PLT (`docs/BLOG-PROPUESTA.md`: MDX en el monorepo,
  `blog.scaleparaguay.com` y `producto.scaleparaguay.com`), pendiente de
  aprobación del dueño.
