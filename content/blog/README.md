# Blog — guía para autores

Contenido en Markdown (archivos `.mdx`) con frontmatter. Sin CMS: se publica por
PR y el deploy lo hace el release normal. El contrato se valida en build y en
los tests (`tests/blog-156.test.ts` y el test de contenido de la vertical COM).

## Estructura

```
content/blog/empresa/AAAA-MM-slug.mdx    → blog.scaleparaguay.com
content/blog/producto/AAAA-MM-slug.mdx   → producto.scaleparaguay.com
```

- El nombre del archivo empieza con el mes de publicación (`AAAA-MM-slug.mdx`).
- URL pública: `https://<host>/<categoría>/<slug>` (el slug es el nombre sin el
  `AAAA-MM-`). Esa misma URL va en `canonical`.

## Frontmatter (obligatorio)

```yaml
---
title: Título de 15 a 60 caracteres
description: Resumen de 60 a 155 caracteres para buscadores y RSS.
date: 2026-10-03
author: Scale Paraguay            # o Scale OS
canonical: https://blog.scaleparaguay.com/servicios/mi-slug
categories: [servicios]           # exactamente una, de la lista del blog
tags: [agencias, operación]       # hasta 3
cover: /brand/share.png           # portada (ruta local o URL https)
coverAlt: Descripción de la portada para lectores de pantalla
draft: false                      # true = no se publica ni indexa
seoTitle: Título alterno corto    # opcional, ≤60
---
```

Categorías válidas:
- **empresa**: `servicios`, `casos`, `cultura`, `noticias`.
- **producto**: `novedades`, `guias`, `changelog`, `casos`.

## Cuerpo

- **Sin H1** (el título lo dibuja la plantilla); al menos **dos `##`**.
- **≥400 palabras** de contenido real.
- **CTA** obligatorio: empresa → `https://wa.me/595993391354` o
  `https://scaleparaguay.com/#contacto`; producto → `https://sistema.scaleparaguay.com/demo`.
- **Enlace interno** del propio blog (`https://blog.scaleparaguay.com/…` o
  `https://producto.scaleparaguay.com/…`).
- **Cross-linking**: al menos un artículo de cada blog enlaza al otro con
  `?utm_medium=cross` (así se mide el tráfico entre blogs).
- `draft: true` no aparece en índice, sitemap ni RSS, y su URL devuelve 404.
- Fase 1 no acepta imports/JSX dentro del contenido; si hace falta, se incorpora
  `@next/mdx` sin mover los archivos.
