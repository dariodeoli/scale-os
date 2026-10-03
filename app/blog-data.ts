import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import matter from 'gray-matter';
import {BLOG_ORIGINS,type BlogSection} from './seo';

// Contenido del blog (issue #156/#157, Fase 1 aprobada): MDX con frontmatter en
// `content/blog/<sección>/`, leído en build para páginas estáticas. El módulo es
// de servidor: no lo importes desde componentes de cliente ni desde middleware.
export type BlogPost = {
  section: BlogSection;
  slug: string;
  title: string;
  description: string;
  seoTitle: string | null;
  date: string;
  author: string;
  categories: string[];
  tags: string[];
  cover: string;
  coverAlt: string;
  canonical: string;
  draft: boolean;
  body: string;
  file: string;
};

export const BLOG_SECTIONS: readonly BlogSection[] = ['empresa', 'producto'];
export const BLOG_CATEGORIES: Record<BlogSection, readonly string[]> = {
  empresa: ['servicios', 'casos', 'cultura', 'noticias'],
  producto: ['novedades', 'guias', 'changelog', 'casos'],
};
const CONTENT_DIR = join(process.cwd(), 'content', 'blog');
const FILE = /^(\d{4}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/;
const CTA: Record<BlogSection, RegExp> = {
  empresa: /wa\.me\/595993391354|scaleparaguay\.com\/#contacto/,
  producto: /sistema\.scaleparaguay\.com\/demo/,
};

export function isBlogSection(value: unknown): value is BlogSection {
  return typeof value === 'string' && (BLOG_SECTIONS as readonly string[]).includes(value);
}

const fail = (file: string, message: string): never => {
  throw new Error(`Blog · ${file}: ${message}`);
};

function stringList(file: string, field: string, value: unknown, max: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(file, `${field} debe ser una lista de hasta ${max} etiquetas.`);
  const list = value as unknown[];
  if (list.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 40) || list.length > max) {
    fail(file, `${field} debe ser una lista de hasta ${max} etiquetas cortas.`);
  }
  return list.map(item => String(item).trim());
}

/** Ruta pública del post: `/<categoría>/<slug>` en el host de su blog. */
export function postPath(post: Pick<BlogPost, 'categories' | 'slug'>): string {
  return `/${post.categories[0] || 'general'}/${post.slug}`;
}

/** URL canónica: la declarada en el frontmatter (obligatoria). */
export function postCanonical(post: Pick<BlogPost, 'canonical'>): string {
  return post.canonical;
}

/**
 * Valida y normaliza un archivo del blog; exportado para tests. El contrato es
 * el acordado con la vertical de contenido (tests/blog-content-156-157): títulos
 * y descripciones acotados, una sola categoría válida, canonical con categoría,
 * portada con alt, sin H1, con H2, ≥400 palabras, CTA y enlace interno.
 */
export function parseBlogPost(section: BlogSection, fileName: string, raw: string, file = `${section}/${fileName}`): BlogPost {
  const match = FILE.exec(fileName);
  if (!match) fail(file, 'el archivo debe llamarse AAAA-MM-slug.mdx (minúsculas, números y guiones).');
  const month = match![1], slug = match![2];
  const {data, content} = matter(raw);
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (title.length < 15 || title.length > 60) fail(file, `title debe tener entre 15 y 60 caracteres (tiene ${title.length}).`);
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (description.length < 60 || description.length > 155) fail(file, `description debe tener entre 60 y 155 caracteres (tiene ${description.length}).`);
  const seoTitle = data.seoTitle === undefined || data.seoTitle === null || data.seoTitle === '' ? null : String(data.seoTitle).trim();
  if (seoTitle && seoTitle.length > 60) fail(file, 'seoTitle no puede superar 60 caracteres.');
  const frontmatterText = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
  const date = (/^date:\s*(.+)$/m.exec(frontmatterText)?.[1] || '').trim().replace(/^["']|["']$/g, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) fail(file, 'date debe ser una fecha real en formato AAAA-MM-DD.');
  if (!date.startsWith(month)) fail(file, `el nombre del archivo debe empezar con el mes de publicación (${date.slice(0, 7)}).`);
  const author = typeof data.author === 'string' ? data.author.trim() : '';
  if (author.length <= 2 || author.length > 120) fail(file, 'author debe ser un nombre de 3 a 120 caracteres.');
  const categories = stringList(file, 'categories', data.categories, 4);
  if (categories.length !== 1) fail(file, 'categories debe declarar exactamente una categoría.');
  if (!BLOG_CATEGORIES[section].includes(categories[0])) fail(file, `categoría inválida: "${categories[0]}" (válidas: ${BLOG_CATEGORIES[section].join(', ')}).`);
  const tags = stringList(file, 'tags', data.tags, 3);
  const draft = data.draft === true || data.draft === 'true';
  if (data.draft !== undefined && typeof data.draft !== 'boolean' && data.draft !== 'true' && data.draft !== 'false') fail(file, 'draft debe ser true o false.');
  const cover = data.cover === undefined || data.cover === null ? '' : String(data.cover).trim();
  const coverAlt = data.coverAlt === undefined || data.coverAlt === null ? '' : String(data.coverAlt).trim();
  if (cover && !/^(\/|https:\/\/)/.test(cover)) fail(file, 'cover debe ser una ruta local (/) o una URL https.');
  if (cover && !coverAlt) fail(file, 'coverAlt es obligatorio cuando hay portada.');
  const canonical = typeof data.canonical === 'string' ? data.canonical.trim() : '';
  const expected = `${BLOG_ORIGINS[section]}/${categories[0]}/${slug}`;
  if (canonical !== expected) fail(file, `canonical debe ser ${expected}.`);
  if (!content.trim()) fail(file, 'el cuerpo no puede estar vacío.');
  if (/^# /m.test(content)) fail(file, 'el cuerpo no repite H1 (lo dibuja la plantilla).');
  if (!/^## /m.test(content)) fail(file, 'el cuerpo necesita al menos un H2.');
  const words = content.split(/\s+/).filter(Boolean).length;
  if (words < 400) fail(file, `contenido insuficiente: ${words} palabras (mínimo 400).`);
  if (!CTA[section].test(content)) fail(file, 'falta el CTA del blog.');
  const own = new RegExp(`${BLOG_ORIGINS[section].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[a-z-]+/`);
  if (!own.test(content)) fail(file, 'falta al menos un enlace interno del blog.');
  return {section, slug, title, description, seoTitle, date, author, categories, tags, cover, coverAlt, canonical, draft, body: content, file};
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
