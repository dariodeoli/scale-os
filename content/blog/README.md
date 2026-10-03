# Blog — guía para autores

Contenido en Markdown (archivos `.mdx`) con frontmatter. Sin CMS: se publica por
PR y el deploy lo hace el release normal.

## Estructura

```
content/blog/empresa/AAAA-MM-slug.mdx    → blog.scaleparaguay.com
content/blog/producto/AAAA-MM-slug.mdx   → producto.scaleparaguay.com
```

## Frontmatter obligatorio

```yaml
---
title: Título corto y único
description: Resumen de 40 a 200 caracteres para buscadores y RSS.
date: 2026-10-03
author: Scale Paraguay
categories: [Casos]
tags: [producción, agencias]
cover: /brand/share.png        # opcional; ruta local o URL https
draft: true                    # opcional; true = no se publica ni indexa
canonical: https://…           # opcional; solo si el original vive en otro sitio
---
```

- El **slug** es el nombre del archivo sin la fecha ni la extensión; solo
  minúsculas, números y guiones.
- `draft: true` no aparece en el índice, el sitemap ni el RSS, y la URL devuelve
  404 (no se indexa).
- El cuerpo admite Markdown + GFM (tablas, listas, tachado). Fase 1 no acepta
  imports/JSX dentro del contenido; si hace falta, se incorpora `@next/mdx` sin
  mover los archivos.
- Las imágenes de portada y del cuerpo se suben a `public/landing/` o `public/brand/`
  (o se enlazan por URL https).
