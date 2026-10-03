# Plantillas del blog — #156 (Scale Paraguay) y #157 (Scale OS)

Plantillas listas para que **PLT** arme rutas/hosts y lea `content/blog/**`
(MDX en el monorepo, aprobado por el dueño). DSN entrega el sistema visual y
el contrato de datos; no crea rutas ni toca contenido.

## Entregables

- `app/blog-templates.tsx` — `BlogListTemplate` y `BlogArticleTemplate`
  (presentacionales, sin estado) + `blogArticleJsonLd` (Article + BreadcrumbList).
- `app/blog-templates.css` — hoja de marca: lectura 65–72ch, tokens claro/oscuro,
  foco visible AA, targets de 44 px, `prefers-reduced-motion`.
- `tests/blog-templates.test.tsx` — contrato de estructura, a11y, imágenes con
  dimensiones y JSON-LD (en la regresión).

## Contrato de datos (frontmatter MDX sugerido para PLT/COM)

```yaml
title: string          # único, ≤ 70 caracteres
slug: string           # URL /blog/<slug>
excerpt: string        # ≤ 160 caracteres (meta description y tarjeta)
date: YYYY-MM-DD       # fecha de publicación (visible en <time>)
updated: YYYY-MM-DD    # opcional
author: string         # nombre visible
category: {slug, label}
tags: [string]         # opcional
cover: /ruta.jpg       # opcional, 1200×630
coverAlt: string       # obligatorio si hay cover
readingMinutes: number # opcional
draft: boolean         # PLT filtra los borradores
```

## Qué debe cablear PLT

- Rutas: lista (`/blog`), categoría (`/blog/categoria/<slug>`), artículo
  (`/blog/<slug>`) y RSS; host/dominio por blog (`#156` empresa, `#157` producto
  con `variant="producto"`).
- Metadata única por artículo (título/descripción/canonical/OG 1200×630) y
  `blogArticleJsonLd` en un `<script type="application/ld+json">`.
- Sitemap propio del blog + robots por host, y `rss.xml` con `application/rss+xml`.

## Evidencia

`docs/qa/blog-templates/` — 16 capturas (lista y artículo × empresa/producto ×
390/1440 × claro/oscuro) renderizadas con los componentes y el CSS reales.
Chequeos por captura: 1 H1, 0 imágenes sin `alt`, sin overflow, JSON-LD en
artículos (`work/visual-harness/al4/blog-captures.json`).

## Coordinación

- **PLT**: rutas, MDX, hosts, sitemap/RSS, JSON-LD en la ruta.
- **COM**: contenido y frontmatter según el contrato; los defaults editoriales
  (dos blogs separados) ya están aprobados en #156/#157.
