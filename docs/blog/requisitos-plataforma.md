# Requisitos de contenido para la plataforma de blogs (#156/#157/#158)

Aporte de SOS-COM a la propuesta de plataforma de PLT
([`docs/BLOG-PROPUESTA.md`](../BLOG-PROPUESTA.md) en la rama de PLT). No elige
tecnología ni dominio: enumera **lo que el contenido necesita**. Si la Fase 1
aprobada es MDX en el monorepo, estos campos se implementan como **frontmatter**
y convenciones de carpeta (`content/blog/empresa|producto/AAAA-MM-slug.mdx`);
si más adelante se migra a CMS, como campos del modelo. Prioridad: **[M] must**
(sin esto no se publica) y **[D] deseable** (fase 2).

## 1. Modelo de contenido

**Post** [M] — frontmatter base ya propuesto por PLT (`title`, `description`,
`date`, `author`, `categories`, `tags`, `cover`, `draft`, `canonical?`) más la
ampliación que pide el contenido: `seoTitle` (≤ 60) y `coverAlt` [M],
`updated` (fecha de actualización visible) y `crossPost` (par cruzado con UTM)
[M], `feed` (excluir de RSS) [D]. El `slug` sale del nombre del archivo (corto,
sin fecha en la URL pública aunque el archivo la ordene); `readingTime` se
calcula, no se escribe.

**Autor** [M]: `name`, `role`, `bio` (≤ 400), `photo`, `instagram`/`linkedin`
opcionales. Autoría compartida de equipo (“Equipo de producción”) y autoría
institucional para novedades [D].

**Categoría** [M]: `slug`, `name`, `description` (para la página de archivo).
Las cuatro secciones están definidas en la capa editorial
(`156-scale-paraguay.md` §2.1 y `157-scale-os.md` §2).

**Caso** [M]: bloque `case` en el frontmatter, no HTML libre: `client` (o
“confidencial”), `sector`, `permission` (con fecha/archivo de autorización),
`results[]` (`metric`, `value`, `period`, `source`) y `testimonial`. Los
números y la autorización se revisan antes de publicar.

**Media** [M]: portada y OG por artículo; `alt` obligatorio; pie y crédito
opcionales; galería en casos [D].

## 2. Flujo editorial y permisos

Con MDX la publicación es por **PR** (PLT): `draft: true` no se indexa ni
aparece en el feed; el preview del PR es la revisión. Estados plenos
(`borrador → en revisión → programado → publicado → archivado`) quedan para una
Fase 2 con CMS; en Fase 1 la programación real es “mergear el PR el día de
publicación” o un build programado [M].

- Roles: autor (PR propio), editor (revisa estilo/datos y mergea), dirección
  (aprueba casos y temas sensibles) [M]. Con MDX los permisos son los del repo;
  si se suman colaboradores no técnicos, evaluar Fase 2 antes [D].
- `draft: true` con preview no indexable [M]; borradores fuera de sitemap/RSS
  [M].
- Historial de versiones = historial del repo [M]; “deshacer publicación” =
  revertir el PR [D].
- Campos de aprobación del caso (quién autorizó, cuándo) en el propio
  frontmatter, sin exponerse en el front [M].

## 3. SEO on-page y técnico (coordinado con #158)

- Título SEO y meta description editables, con vista previa de la tarjeta
  social (OG/Twitter) [M].
- URL canónica por blog; sin duplicar contenido entre Scale Paraguay y Scale
  OS [M].
- Datos estructurados: `Article` + `BreadcrumbList` por artículo, `FAQPage`
  cuando la pieza tenga preguntas [M]; `Organization` y `WebSite` por sitio [M].
- Sitemap propio por blog + `robots` con reglas explícitas (blogs indexables;
  `app.scaleparaguay.com` fuera del índice) [M].
- 301 automática o asistida al cambiar un `slug` [M]; 404 útil con enlaces a
  categorías [D].
- RSS 2.0/Atom (ver §4) y Open Graph con imagen 1200×630 [M].
- Search Console verificado por blog, con informe de cobertura [D].

## 4. Feed y newsletter

- **RSS/Atom** con resumen o contenido completo a elección, portada incluida,
  excluyendo borradores y contenido no público (`feed: false`) [M].
- JSON Feed [D].
- Export de posts en formato reutilizable (HTML/Markdown) para newsletter y
  redes [D]. Si se agrega newsletter, el alta necesita Aviso de privacidad y
  consentimiento explícito (Ley N° 7593/2025), con baja en un clic [M].

## 5. Cross-blog

- Los dos blogs son sitios separados (identidad, canonical y sitemap propios)
  pero comparten la misma plataforma [M].
- Campo o convención para declarar el par cruzado (`crossPostUrl` con `utm`)
  y mostrarlo como bloque al final del artículo [M].
- Reglas de contenido: máx. 1 enlace cruzado por artículo y con contexto
  (ver `156-scale-paraguay.md` §6 y `157-scale-os.md` §5) [M].

## 6. Imágenes y rendimiento

- Portadas 16:9 ≥ 1600×900 y OG 1200×630; WebP optimizado (la API ya
  normaliza fotos a ≤ 180 KB; el blog define su propio límite) [M].
- Dimensiones declaradas / `aspect-ratio` para no mover el layout (CLS) [M].
- LCP: portada optimizada y sin fuentes bloqueantes; accesibilidad AA
  (contraste, foco visible, `alt`, subtítulos si hay video) [M].
- Texto legible sin depender de JavaScript [D].

## 7. Lo que la plataforma NO debe imponer al contenido

- No forzar un mismo template para guía, caso y novedad: las tres plantillas
  tienen estructura distinta (`156-scale-paraguay.md` §2.3).
- No obligar a publicar en ambos blogs a la vez.
- No mezclar identidades: aunque compartan base, el visitante no debe sentir
  que está en el mismo sitio.
- No exponer información interna en las novedades (el post curado solo usa la
  parte de `NOVEDADES.md` ya pública).

## 8. Checklist para evaluar la propuesta de PLT

1. ¿Cómo se crean y firman autores y coautores?
2. ¿Cómo se cargan portada, OG y galería, y quién los optimiza?
3. ¿Edita metadatos SEO por artículo con vista previa social?
4. ¿Cómo se programan publicaciones y se previsualizan sin indexar?
5. ¿Cómo se emiten sitemap, structured data y RSS por blog?
6. ¿Cómo se resuelven redirects al cambiar un slug?
7. ¿Qué pasa con los datos de suscriptores y el consentimiento?
8. ¿Cuánto cuesta hosting/publicación por mes y quién opera el sistema?
