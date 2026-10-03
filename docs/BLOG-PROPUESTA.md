# Propuesta — Plataforma de blogs (Scale Paraguay + Scale OS)

Refs #156 (blog de empresa) y #157 (blog de producto). Pedido del dueño 03-10:
**dos blogs separados**. Este documento es la propuesta previa obligatoria; la
implementación arranca solo con su aprobación.

## Contexto técnico actual

- Monorepo `scale-os`: front Next.js 15 (App Router) + API Express/Postgres; deploy
  por Coolify con dos servicios (web en la raíz, API con base `backend/`) y un
  release versionado por `npm run release:patch`.
- Hosts en uso: `sistema.scaleparaguay.com` (landing estática), `app.scaleparaguay.com`
  (producto), `cliente.scaleparaguay.com` (portal), `admin.scaleparaguay.com`
  (superadmin) y `api.scaleparaguay.com`.
- Rutas por host en `middleware.ts`; no hay CMS, ni MDX, ni blog hoy.
- El contenido de producto ya existe como `docs/NOVEDADES.md` (acumulativo por
  versión, lo mantiene el integrador en cada ciclo).

## Opciones evaluadas

| Criterio | MDX en el monorepo (recomendado) | CMS headless (Sanity/Payload/Strapi) | Ghost self-hosted | SSG separado (Astro/Hugo) |
|---|---|---|---|---|
| Costo | **US$ 0** (mismo servicio Next) | Sanity free / Payload en VPS (~US$ 5–15/mes) / Contentful ~US$ 300/mes | Ghost Pro US$ 9–25/mes o VPS + mantenimiento | US$ 0–10/mes |
| Infra nueva | Ninguna | Servicio + DB + despliegue + backups | App y DB propias + updates | Repo/stack nuevo |
| Edición | PR en GitHub con preview; requiere saber Git | UI para no técnicos, borradores y programación | UI de blog madura | PR/Markdown |
| SEO | Estático, control total (canonical, JSON-LD, sitemap, RSS) | Depende de integración/render | Muy bueno de fábrica | Estático |
| Marca/tema | Componentes compartidos con la landing actual | Tema propio + integración de marca | Tema propio (Handlebars) | Tema propio |
| Auth/permisos | La del repo (revisión por PR) | Cuentas del CMS (otra superficie) | Cuentas propias | — |
| Cross-linking entre blogs | Trivial (mismo repo, mismos componentes) | Enlaces manuales | Multi-site de Ghost posible | Enlaces manuales |
| Mantenimiento | El del repo | Actualizaciones del CMS | Parches de Ghost + DB | Stack extra |
| Time-to-first-post | Días | Semana+ (setup/integración) | Días | Semana |

## Recomendación

**Fase 1: MDX en el monorepo**, con dos secciones de contenido y dos hosts:

- `blog.scaleparaguay.com` → blog de empresa (casos de éxito, cultura, noticias,
  servicios).
- `producto.scaleparaguay.com` → blog de Scale OS (novedades derivadas de
  `docs/NOVEDADES.md`, guías de uso, changelog extendido, casos).
  Alternativas si el dueño prefiere otro nombre: `os.scaleparaguay.com` o
  `novedades.scaleparaguay.com`. Si Scale OS estrena dominio propio más adelante,
  el blog se muda con canonical + redirecciones 301.

Estructura:

```
content/blog/empresa/AAAA-MM-slug.mdx
content/blog/producto/AAAA-MM-slug.mdx
```

Frontmatter único: `title`, `description`, `date`, `author`, `categories`, `tags`,
`cover`, `draft`, `canonical?`. El render usa los componentes de marca actuales;
`#158` aporta canonical, JSON-LD `Article`/`Organization`, sitemap y RSS por host.

**Quién publica**: Dario y el colaborador de contenido vía PR (el integrador
revisa y despliega como cualquier release). DSN define la plantilla visual; PLT la
infraestructura.

**Fase 2 (si hace falta edición no técnica o programación)**: adoptar un CMS
headless sin rehacer la web. Recomendado **Sanity** (free tier: 2 usuarios y
10k documentos; escalón pago ~US$ 15/usuario/mes) o **Payload self-hosted** si se
quiere todo en la misma base Postgres (requiere servicio propio y backups). La
migración es directa porque el modelo de contenido ya queda definido por el
frontmatter.

## Costos (sin aprobación de gastos nuevos)

| Ítem | Fase 1 | Fase 2 opcional |
|---|---|---|
| Hosting | US$ 0 marginal (mismo servicio Coolify) | Sanity free → ~US$ 15/usuario/mes; Payload ~US$ 5–15/mes de VPS |
| Dominio | Subdominios del apex actual (US$ 0) | igual |
| Herramientas | Markdown/MDX + repo | CMS |
| Mantenimiento | El del release normal | Actualizaciones del CMS |

## Estructura editorial propuesta

- **Empresa** (`#156`): Casos de éxito · Cultura · Noticias · Servicios; portada con
  destacados, categorías y autores; CTA a contacto/demo.
- **Producto** (`#157`): Novedades (una entrada por release, enlazando
  `NOVEDADES.md`) · Guías de uso · Changelog extendido · Casos de uso; CTA a
  registro/demo.
- Cross-linking: cada entrada de producto enlaza el caso de empresa relacionado y
  viceversa; ambos blogs comparten pie, tipografía y tokens de marca.
- SEO/analítica: metadatos y JSON-LD por plantilla, sitemap propio, RSS, Search
  Console por host y medición de indexación (se coordina con `#158`).

## Próximos pasos (con aprobación del dueño)

1. Aprobar plataforma y hosts (este documento).
2. Abrir la implementación en `#156`/`#157` Fase 2: rutas por host, plantillas,
   RSS/sitemap/JSON-LD, editorial del primer contenido y guía de publicación.
3. Registrar los subdominios y verificarlos en Search Console.
