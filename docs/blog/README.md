# Propuesta editorial de blogs (Scale Paraguay · Scale OS)

Documentación de la **propuesta para aprobación del dueño** (issues
[#156](https://github.com/dariodeoli/scale-os/issues/156) y
[#157](https://github.com/dariodeoli/scale-os/issues/157)).
No hay implementación: acá viven el contenido, la estructura editorial y los
requisitos que la plataforma (PLT) debe cumplir.

## Documentos

| Archivo | Issue | Qué propone |
|---|---|---|
| [`156-scale-paraguay.md`](156-scale-paraguay.md) | #156 | Blog de la empresa: categorías, autores, plantillas, calendario, 10 títulos con intención/keyword, tono y CTAs hacia Scale OS |
| [`157-scale-os.md`](157-scale-os.md) | #157 | Blog de producto: series (novedades, guías, casos), 12 títulos, cross-linking con Scale Paraguay |
| [`requisitos-plataforma.md`](requisitos-plataforma.md) | #156/#157/#158 | Requisitos de contenido para la plataforma y el SEO técnico (autores, imágenes, on-page, feed, flujo editorial) |

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
