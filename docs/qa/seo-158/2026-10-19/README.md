# Seguimiento SEO #158 sobre producción 1.0.195

Auditoría del 19-10-2026 UTC, base `fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d`.

## Correcciones verificadas en fuente

Las portadas locales de los artículos (`/brand/share.png`) se entregaban como
rutas relativas a OG/Twitter y Article. Los metadatos heredan `metadataBase`
de la app autenticada: la imagen social podía resolverse contra
`app.scaleparaguay.com`, en lugar del host público del blog. Ahora OG, Twitter
y Article usan la URL absoluta del blog de la sección; OG/Twitter incluyen el
texto alternativo editorial ya registrado. Una portada HTTPS externa conserva
su URL.

Se agregó `BreadcrumbList` con dos niveles, inicio del blog y artículo, cuyas
URLs coinciden con los enlaces visibles y la canónica. No modifica el contenido
editorial ni incluye borradores/publicaciones futuras.

La regresión nueva falla contra la fuente original de `origin/main` y pasa con
el cambio. Comprueba ambas secciones, metadatos reales y JSON-LD renderizado.

## Pruebas

- `node --import tsx --test tests/blog-156.test.ts tests/seo-158.test.ts tests/seo-158-infra.test.ts`: **15/15 PASS**.
- `npx tsc --noEmit`: **PASS**.
- Build y regresión completos: a cargo del integrador en el candidato combinado.

## Producción y límites de la observación

`public-hosts.json` conserva respuestas públicas sin sesión. La app respondió
200, con cabecera `X-Robots-Tag: noindex, nofollow`, meta robots noindex y
`robots.txt` con `Disallow: /`.

Las solicitudes HTTPS a sistema/admin/cliente/blog/producto fueron rechazadas
por el proxy del entorno (`Tunnel connection failed: 403 Forbidden`). No son
respuestas del servidor Scale: esta ejecución no acredita disponibilidad,
DNS, canonicals, imágenes ni CWV actuales de esos hosts. El coordinador preparó
un borrador aditivo de red; su publicación está pendiente. No se alteró DNS.

La fuente de landing mantiene canonical, robots indexable, Organization,
WebSite y SoftwareApplication únicos; las suites SEO verificaron también
sitemap, portada social 1200×630 y política pública canónica. Esto es evidencia
de fuente/pruebas, no sustituye una nueva observación de producción bloqueada.

No hay acceso a Search Console/CrUX configurado en esta sesión: no se verificó
propiedad, envío de sitemap, cobertura, indexación ni CWV de campo. No se
presenta la medición lab histórica como medición actual. El issue permanece
abierto por estas validaciones externas y por la integración/publicación del
cambio. No se ejecutó deploy desde esta rama.
