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
  date: string;
  author: string;
  categories: string[];
  tags: string[];
  cover: string | null;
  canonical: string | null;
  draft: boolean;
  body: string;
  file: string;
};

export const BLOG_SECTIONS: readonly BlogSection[] = ['empresa', 'producto'];
const CONTENT_DIR = join(process.cwd(), 'content', 'blog');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isBlogSection(value: unknown): value is BlogSection {
  return typeof value === 'string' && (BLOG_SECTIONS as readonly string[]).includes(value);
}

const fail = (file: string, message: string): never => {
  throw new Error(`Blog · ${file}: ${message}`);
};

function stringList(file: string, field: string, value: unknown, max = 6): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(file, `${field} debe ser una lista de hasta ${max} etiquetas cortas.`);
  const list = value as unknown[];
  if (list.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > 40) || list.length > max) {
    fail(file, `${field} debe ser una lista de hasta ${max} etiquetas cortas.`);
  }
  return list.map(item => String(item).trim());
}

/** Valida y normaliza un archivo del blog; exportado para tests. */
export function parseBlogPost(section: BlogSection, slug: string, raw: string, file = `${section}/${slug}.mdx`): BlogPost {
  if (!SLUG.test(slug)) fail(file, 'el nombre del archivo debe ser un slug en minúsculas (letras, números y guiones).');
  const {data, content} = matter(raw);
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (title.length < 4 || title.length > 90) fail(file, 'title debe tener entre 4 y 90 caracteres.');
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (description.length < 40 || description.length > 200) fail(file, 'description debe tener entre 40 y 200 caracteres.');
  const frontmatterText=/^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1]??'';
  const rawDate=(/^date:\s*(.+)$/m.exec(frontmatterText)?.[1]||'').trim().replace(/^["']|["']$/g,'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)||Number.isNaN(Date.parse(`${rawDate}T12:00:00Z`))||new Date(`${rawDate}T12:00:00Z`).toISOString().slice(0,10)!==rawDate) fail(file, 'date debe ser una fecha real en formato AAAA-MM-DD.');
  const date=rawDate;
  const author = typeof data.author === 'string' ? data.author.trim() : '';
  if (author.length < 2 || author.length > 120) fail(file, 'author debe tener entre 2 y 120 caracteres.');
  const draftValue = data.draft;
  if (draftValue !== undefined && draftValue !== null && typeof draftValue !== 'boolean' && draftValue !== 'true' && draftValue !== 'false') fail(file, 'draft debe ser true o false.');
  const draft = draftValue === true || draftValue === 'true';
  const cover = data.cover === undefined || data.cover === null || data.cover === '' ? null : String(data.cover);
  if (cover && !/^(\/|https:\/\/)/.test(cover)) fail(file, 'cover debe ser una ruta local (/) o una URL https.');
  const canonical = data.canonical === undefined || data.canonical === null || data.canonical === '' ? null : String(data.canonical);
  if (canonical && !/^https:\/\/\S+$/.test(canonical)) fail(file, 'canonical debe ser una URL https.');
  if (!content.trim()) fail(file, 'el cuerpo no puede estar vacío.');
  return {
    section,
    slug,
    title,
    description,
    date,
    author,
    categories: stringList(file, 'categories', data.categories),
    tags: stringList(file, 'tags', data.tags),
    cover,
    canonical,
    draft,
    body: content,
    file,
  };
}

const cache = new Map<BlogSection, BlogPost[]>();

/** Posts de una sección, más nuevos primero. Los borradores no se listan. */
export function listPosts(section: BlogSection, {includeDrafts = false}: {includeDrafts?: boolean} = {}): BlogPost[] {
  let posts = cache.get(section);
  if (!posts) {
    const dir = join(CONTENT_DIR, section);
    posts = !existsSync(dir) ? [] : readdirSync(dir)
      .filter(name => name.endsWith('.mdx'))
      .map(name => parseBlogPost(section, name.replace(/\.mdx$/, ''), readFileSync(join(dir, name), 'utf8'), `${section}/${name}`))
      .filter(post => post.slug && post.date);
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

/** URL canónica del post en el host de su blog. */
export function postCanonical(section: BlogSection, slug: string, canonical?: string | null): string {
  return canonical || `${BLOG_ORIGINS[section]}/${slug}`;
}
