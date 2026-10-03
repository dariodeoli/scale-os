# Informe SEO técnico — parte front (#158)

- Base: `origin/main` v1.0.168. Alcance front (DSN); infraestructura de Search
  Console y datos de campo se coordinan con PLT.
- Medición lab: `work/visual-harness/al4/cwv-158.json` (Chrome headless, sin
  caché, sobre el documento real instrumentado del harness).

## Auditoría (lo que ya estaba bien)

| Punto | Estado |
| --- | --- |
| Landing (`public/scale-os.html`): título, descripción, canonical, robots, OG, Twitter, theme-color | ✅ presentes y únicos |
| `lang="es"`, viewport, iconos, manifest | ✅ |
| Structured data | ⚠️ existía `Organization` + `WebSite` + `SoftwareApplication`, pero **`SoftwareApplication` duplicado** (bloque suelto + grafo) |
| Imagen social | ⚠️ OG y JSON-LD apuntaban a `/brand/share.png`, **archivo inexistente** |
| Sitemap/robots por host | ✅ en `middleware.ts`: `sistema` permite y declara sitemap; `cliente` y `app` desindexan con `X-Robots-Tag` |
| App autenticada | ✅ `metadata.robots` `index:false,follow:false` + `app/robots.ts` disallow |
| `/privacidad` | ⚠️ título/descripción únicos, **sin canonical ni OG** |
| FAQ | visible en la landing; **sin `FAQPage`** (decisión abajo) |

## Fixes aplicados

1. **`public/brand/share.png` (1200×630)**: creado desde la landing real
   (marca + titular + propuesta). Antes las tarjetas sociales y el `image` del
   JSON-LD daban 404.
2. **JSON-LD consolidado**: una sola declaración; el grafo agrega
   `publisher` de `SoftwareApplication` a `Organization` y **`offers` reales**
   (`US$10/mes`, `G.50.000/mes`) con la URL de registro. Se retiró el bloque
   duplicado.
3. **Descripción de la landing** acotada a 132 caracteres (era 221; Google
   corta alrededor de 155–160).
4. **`/privacidad`**: `alternates.canonical` a
   `https://sistema.scaleparaguay.com/privacidad` + `openGraph` propio.
5. **Test de contrato** `tests/seo-158.test.ts` (metadatos, JSON-LD único y
   válido, share.png 1200×630, robots/sitemap por host, noindex de la app).

## Medición (lab, localhost — sin latencia de red)

| Ancho | FCP | LCP | CLS | TBT | Peso inicial |
| --- | --- | --- | --- | --- | --- |
| 390×844 (móvil) | 88 ms | 88 ms | **0** | 0 ms | ~62 KB |
| 1440×900 | 44 ms | 44 ms | **0,0006** | 0 ms | ~67 KB |

- Las tres capturas del producto (`/landing/*.jpg`, 120–200 KB) están **bajo el
  pliegue con `loading="lazy"` y dimensiones explícitas**: no entran al peso
  inicial ni generan CLS.
- LCP/FCP de campo (CrUX/Search Console) y TTFB real son de PLT; el lab sólo
  confirma que no hay layout shift ni long tasks en el arranque.

## Decisión FAQ

No se publica `FAQPage`: Google restringió los rich results de FAQ a sitios de
gobierno/salud (2023), así que el schema no produciría resultado y sólo sumaría
mantenimiento. La FAQ visible se conserva y queda cubierta por
`tests/landing-sales.test.mjs`.

## Coordinación con PLT (infra)

1. **Search Console**: verificar el dominio `sistema.scaleparaguay.com`
   (propiedad de URL o DNS) y enviar `https://sistema.scaleparaguay.com/sitemap.xml`
   (ya servido por middleware con `/` y `/privacidad`).
2. **Datos de campo**: monitorear Core Web Vitals reales (CrUX) de la landing y
   las públicas; hoy sólo hay medición lab.
3. **Sitemap futuro**: si PLT/COM agregan páginas públicas nuevas (blogs #156/#157),
   sumarlas al sitemap del host correspondiente.
4. **Portal público de propuestas** (`/p/:token`, `/review/:path*`): viven en el
   API; verificar que respondan `X-Robots-Tag: noindex` desde PLT (acá quedan
   fuera del sitemap).
5. **Redirecciones/404**: el middleware ya resuelve legacy y hosts; revisar en
   Search Console los 404 reales una vez verificada la propiedad.
