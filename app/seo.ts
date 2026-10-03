// Fuente única de descubrimiento SEO por host (issue #158). El middleware la
// sirve en runtime y `build-tools/sync-seo.ts` la replica en `public/` para
// mantener una sola definición de robots y sitemap.
export const SEO_LANDING_ORIGIN = 'https://sistema.scaleparaguay.com';
export const SEO_APP_ORIGIN = 'https://app.scaleparaguay.com';
export const SEO_LANDING_PATHS = ['/', '/privacidad'] as const;

/** robots.txt de la landing: indexable, con el sitemap canónico. */
export function landingRobotsTxt(): string {
  return `User-agent: *\nAllow: /\nSitemap: ${SEO_LANDING_ORIGIN}/sitemap.xml\n`;
}

/** robots.txt de la app autenticada: fuera de los buscadores. */
export function appRobotsTxt(): string {
  return 'User-agent: *\nDisallow: /\n';
}

/** Sitemap XML de las superficies públicas de la landing. */
export function landingSitemapXml(paths: readonly string[] = SEO_LANDING_PATHS): string {
  const urls = paths
    .map(path => `  <url><loc>${SEO_LANDING_ORIGIN}${path === '/' ? '/' : path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
