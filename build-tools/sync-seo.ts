/*
 * Sincroniza `public/robots.txt` y `public/sitemap.xml` con la fuente única
 * `app/seo.ts` (issue #158). Corre en el prebuild; el middleware sirve el mismo
 * contenido en runtime para los hosts.
 */
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {appRobotsTxt, landingRobotsTxt, landingSitemapXml} from '../app/seo';

const repo = fileURLToPath(new URL('..', import.meta.url));
writeFileSync(new URL('../public/robots.txt', import.meta.url), landingRobotsTxt());
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), landingSitemapXml());
console.log(JSON.stringify({event: 'seo_sync', robots: 'landing', sitemap: landingSitemapXml().length, appRobots: appRobotsTxt().length, repo}));
