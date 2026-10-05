import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import matter from 'gray-matter';
import {BLOG_ORIGINS,type BlogSection} from './seo';

// Contenido del blog (#156/#157). Contrato único (docs/BLOG-PROPUESTA.md +
// docs/blog/frontmatter-fase1.md): URL pública `/<slug>` con el slug del
// archivo sin la fecha; `canonical` OPCIONAL (si falta se deriva); categorías
// por nombre visible o slug y se normalizan a slug + nombre. El módulo es de
// servidor: no lo importes desde componentes de cliente ni desde middleware.
export type BlogPost = {
  section: BlogSection;
  slug: string;
  title: string;
  description: string;
  seoTitle: string | null;
  date: string;
  author: string;
  /** Slugs de categoría (normalizados). */
  categories: string[];
  /** Nombres visibles de esas categorías. */
  categoryNames: string[];
  tags: string[];
  cover: string;
  coverAlt: string;
  /** Canonical declarada; si falta, `postCanonical` la deriva del host. */
  canonical: string | null;
  draft: boolean;
  body: string;
  file: string;
};

export const BLOG_SECTIONS: readonly BlogSection[] = ['empresa', 'producto'];
export const BLOG_CATEGORIES: Record<BlogSection, readonly {slug: string; name: string}[]> = {
  empresa: [{slug: 'servicios', name: 'Servicios'}, {slug: 'casos', name: 'Casos'}, {slug: 'cultura', name: 'Cultura'}, {slug: 'noticias', name: 'Noticias'}],
  producto: [{slug: 'novedades', name: 'Novedades'}, {slug: 'guias', name: 'Guías'}, {slug: 'changelog', name: 'Changelog'}, {slug: 'casos', name: 'Casos'}],
};
const CONTENT_DIR = join(process.cwd(), 'content', 'blog');
const FILE = /^(\d{4}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/;

export function isBlogSection(value: unknown): value is BlogSection {
  return typeof value === 'string' && (BLOG_SECTIONS as readonly string[]).includes(value);
}

const fail = (file: string, message: string): never => {
  throw new Error(`Blog · ${file}: ${message}`);
};
const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** Ruta pública del post en el host de su blog (contrato: `/<slug>`). */
export function postPath(post: Pick<BlogPost, 'slug'>): string {
  return `/${post.slug}`;
}

/** URL canónica: la declarada o la derivada del host y el slug. */
export function postCanonical(post: Pick<BlogPost, 'section' | 'slug' | 'canonical'>): string {
  return post.canonical || `${BLOG_ORIGINS[post.section]}/${post.slug}`;
}

function stringList(file: string, field: string, value: unknown, max: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(file, `${field} debe ser una lista de hasta ${max} elementos.`);
  const list = value as unknown[];
  if (list.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 40) || list.length > max) {
    fail(file, `${field} debe ser una lista de hasta ${max} elementos cortos.`);
  }
  return list.map(item => String(item).trim());
}

/**
 * Valida y normaliza un archivo del blog; exportado para tests. Contrato de
 * plataforma: campos base, fecha/nombre, una categoría válida (por nombre o
 * slug), canonical opcional del host, alt con portada y sin H1 en el cuerpo.
 */
export function parseBlogPost(section: BlogSection, fileName: string, raw: string, file = `${section}/${fileName}`): BlogPost {
  const match = FILE.exec(fileName);
  if (!match) fail(file, 'el archivo debe llamarse AAAA-MM-slug.mdx (minúsculas, números y guiones).');
  const month = match![1], slug = match![2];
  const {data, content} = matter(raw);
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (title.length < 10 || title.length > 90) fail(file, `title debe tener entre 10 y 90 caracteres (tiene ${title.length}).`);
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (description.length < 40 || description.length > 200) fail(file, `description debe tener entre 40 y 200 caracteres (tiene ${description.length}).`);
  const seoTitle = data.seoTitle === undefined || data.seoTitle === null || data.seoTitle === '' ? null : String(data.seoTitle).trim();
  if (seoTitle && seoTitle.length > 60) fail(file, 'seoTitle no puede superar 60 caracteres.');
  const frontmatterText = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
  const date = (/^date:\s*(.+)$/m.exec(frontmatterText)?.[1] || '').trim().replace(/^["']|["']$/g, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) fail(file, 'date debe ser una fecha real en formato AAAA-MM-DD.');
  if (!date.startsWith(month)) fail(file, `el nombre del archivo debe empezar con el mes de publicación (${date.slice(0, 7)}).`);
  const author = typeof data.author === 'string' ? data.author.trim() : '';
  if (author.length < 2 || author.length > 120) fail(file, 'author debe ser un nombre de 2 a 120 caracteres.');
  const rawCategories = stringList(file, 'categories', data.categories, 2);
  if (rawCategories.length !== 1) fail(file, 'categories debe declarar exactamente una categoría.');
  const known = BLOG_CATEGORIES[section].find(entry => normalize(entry.slug) === normalize(rawCategories[0]) || normalize(entry.name) === normalize(rawCategories[0]));
  if (!known) fail(file, `categoría inválida: "${rawCategories[0]}" (válidas: ${BLOG_CATEGORIES[section].map(entry => entry.name).join(', ')}).`);
  const tags = stringList(file, 'tags', data.tags, 3);
  const draft = data.draft === true || data.draft === 'true';
  if (data.draft !== undefined && typeof data.draft !== 'boolean' && data.draft !== 'true' && data.draft !== 'false') fail(file, 'draft debe ser true o false.');
  const cover = data.cover === undefined || data.cover === null ? '' : String(data.cover).trim();
  const coverAlt = data.coverAlt === undefined || data.coverAlt === null ? '' : String(data.coverAlt).trim();
  if (cover && !/^(\/|https:\/\/)/.test(cover)) fail(file, 'cover debe ser una ruta local (/) o una URL https.');
  if (cover && coverAlt.length < 4) fail(file, 'coverAlt es obligatorio (mínimo 4 caracteres) cuando hay portada.');
  const canonical = data.canonical === undefined || data.canonical === null || data.canonical === '' ? null : String(data.canonical).trim();
  const expected = `${BLOG_ORIGINS[section]}/${slug}`;
  if (canonical && canonical !== expected) fail(file, `canonical debe ser ${expected} (o quedar vacío y se deriva).`);
  if (!content.trim()) fail(file, 'el cuerpo no puede estar vacío.');
  if (/^# /m.test(content)) fail(file, 'el cuerpo no repite H1 (lo dibuja la plantilla).');
  if (!/^## /m.test(content)) fail(file, 'el cuerpo necesita al menos un H2.');
  return {section, slug, title, description, seoTitle, date, author, categories: [known!.slug], categoryNames: [known!.name], tags, cover, coverAlt, canonical, draft, body: content, file};
}

const cache = new Map<BlogSection, BlogPost[]>();

/** Posts de una sección, más nuevos primero. Los borradores no se listan. */
export function listPosts(section: BlogSection, {includeDrafts = false}: {includeDrafts?: boolean} = {}): BlogPost[] {
  let posts = cache.get(section);
  if (!posts) {
    const dir = join(CONTENT_DIR, section);
    posts = !existsSync(dir) ? [] : readdirSync(dir)
      .filter(name => name.endsWith('.mdx'))
      .map(name => parseBlogPost(section, name, readFileSync(join(dir, name), 'utf8'), `${section}/${name}`));
    cache.set(section, posts);
  }
  return posts
    .filter(post => includeDrafts || !post.draft)
    .sort((left, right) => right.date.localeCompare(left.date) || right.slug.localeCompare(left.slug));
}

/** Post publicado por slug; `null` para inexistentes o borradores. */
export function getPost(section: BlogSection, slug: string): BlogPost | null {
  const post = listPosts(section).find(candidate => candidate.slug === slug);
  return post && !post.draft ? post : null;
}
