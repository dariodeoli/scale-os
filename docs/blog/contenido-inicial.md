# Contenido inicial de los blogs (ronda 7 · Fase 1 MDX)

Ocho artículos (4 por blog) listos para revisión en el PR. El contrato de
frontmatter usado está en [`frontmatter-fase1.md`](frontmatter-fase1.md)
(coordinado con PLT). Las portadas quedan pendientes de DSN: los `.mdx` van con
`cover: ""` y la plantilla debe tolerar el vacío con un fallback de marca.

## Blog de empresa (`content/blog/empresa/`)

| # | Título | URL (canonical) | Keyword (hipótesis) | Intención | Estado |
|---|---|---|---|---|---|
| 1 | Qué publicar en Instagram cuando tu negocio no vende solo | `/servicios/que-publicar-en-instagram` | `qué publicar en instagram` | Informacional (TOFU) | listo |
| 2 | Calendario de contenidos: planificá un mes en dos horas | `/servicios/calendario-de-contenidos` | `calendario de contenidos` | Informacional (TOFU/MOFU) | listo |
| 3 | Reels que venden: estructura, guion y llamado a la acción | `/servicios/reels-que-venden` | `reels que venden` · `guion para reels` | Informacional (MOFU) | listo |
| 4 | Agencia, freelancer o equipo interno: la cuenta real | `/servicios/agencia-freelancer-o-equipo-interno` | `contratar agencia de marketing paraguay` | Comercial (MOFU) | `draft: true` (menciona modelos comerciales; espera OK del dueño) |

CTA: análisis gratuito (WhatsApp o formulario de contacto). En el #4 hay además
un CTA segmentado a Scale OS (lectores que administran una agencia).

## Blog de producto (`content/blog/producto/`)

| # | Título | URL (canonical) | Keyword (hipótesis) | Intención | Estado |
|---|---|---|---|---|---|
| 1 | Cómo ordenar la producción de una agencia sin planillas | `/guias/ordenar-la-produccion-de-una-agencia` | `software para agencias` · `producción agencia` | Informacional (TOFU/MOFU) | listo |
| 2 | Del presupuesto al cobro: que no se te escape una factura | `/guias/del-presupuesto-al-cobro` | `facturación para agencias` · `cobranza` | Informacional/BOFU | listo |
| 3 | Portal del cliente: menos «¿cómo va?» y más aprobaciones | `/guias/portal-del-cliente` | `portal del cliente agencia` | Informacional (MOFU) | listo |
| 4 | Cómo elegir software de gestión para tu agencia (checklist) | `/guias/elegir-software-de-gestion` | `software de gestión para agencias` | Comercial (BOFU) | `draft: true` (compara herramientas, incluida Scale OS; espera OK del dueño) |

CTA: demo interactiva (`sistema.scaleparaguay.com/demo`) + alta con 30 días
gratis. Enlaces internos entre guías y un enlace cruzado con el blog de empresa
(con UTM `cross`).

## Reglas aplicadas

- Sin H1 en el cuerpo (la plantilla lo dibuja); H2/H3, párrafos cortos y listas.
- Sin casos reales, nombres de clientes ni métricas inventadas.
- Precios: solo referencia a los publicados en `scaleparaguay.com`; no se
  escriben cifras que puedan quedar viejas.
- Cross-linking: un enlace cruzado por artículo como máximo, con UTM.
- Los dos artículos `draft: true` son comerciales (posición de Scale y
  comparación de herramientas): requieren aprobación del dueño antes de
  publicar. El resto queda listo para revisión en el PR.

## Pendientes

1. **Portadas** (DSN): set visual por sección; al definirse se completan
   `cover`/`coverAlt`.
2. **Autores** (PLT): hoy `author` es texto; si se implementa entidad de autor,
   se migra a `authors` + bio/foto.
3. **Serie Novedades** (producto): arranca con el primer release posterior al
   lanzamiento del blog, curado desde `docs/NOVEDADES.md`.
