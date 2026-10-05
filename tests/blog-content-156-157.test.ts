import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {test} from 'node:test';
import {join} from 'node:path';
import {listPosts} from '../app/blog-data';

// Contenido de los blogs (#156/#157, Fase 1 MDX).
//
// Dos capas, según el contrato acordado:
//  1. Contrato de plataforma (docs/BLOG-PROPUESTA.md + docs/blog/requisitos-plataforma.md)
//     sobre TODOS los .mdx de `content/blog/`: campos base, fecha y nombre,
//     `canonical` OPCIONAL (si se declara, debe ser del host del blog),
//     alt obligatorio cuando hay portada (a11y) y como máximo un H1.
//  2. Reglas editoriales de la ronda (docs/blog/156-*.md y 157-*.md) sobre los
//     8 artículos producidos: límites SEO, taxonomía, etiquetas, extensión,
//     CTA y enlaces internos/cruzados.
//
// Los ejemplos de la plataforma (autoría de PLT) solo pasan por la capa 1: no
// se les exige la política editorial de esta ronda.

const BLOGS = {
  empresa: {
    dir: 'content/blog/empresa',
    host: 'https://blog.scaleparaguay.com',
    categorias: ['servicios', 'casos', 'cultura', 'noticias'],
    cta: /wa\.me\/595993391354|scaleparaguay\.com\/#contacto/,
  },
  producto: {
    dir: 'content/blog/producto',
    host: 'https://producto.scaleparaguay.com',
    categorias: ['novedades', 'guias', 'changelog', 'casos'],
    cta: /sistema\.scaleparaguay\.com\/demo/,
  },
} as const;

/** Artículos producidos en la ronda (#156/#157); el slug sale del archivo. */
const RONDA: Record<keyof typeof BLOGS, string[]> = {
  empresa: ['que-publicar-en-instagram', 'calendario-de-contenidos', 'reels-que-venden', 'agencia-freelancer-o-equipo-interno'],
  producto: ['ordenar-la-produccion-de-una-agencia', 'del-presupuesto-al-cobro', 'portal-del-cliente', 'elegir-software-de-gestion'],
};

type Frontmatter = Record<string, string | string[] | boolean>;

function frontmatter(raw: string, file: string): {data: Frontmatter; body: string} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert(match, `${file}: sin frontmatter delimitado por ---`);
  const data: Frontmatter = {};
  for (const line of match![1].split('\n')) {
    if (!line.trim()) continue;
    const separator = line.indexOf(':');
    assert(separator > 0, `${file}: línea de frontmatter inválida: ${line}`);
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (value.startsWith('[')) {
      data[key] = value.slice(1, -1).split(',').map((item) => item.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else if (value === 'true' || value === 'false') {
      data[key] = value === 'true';
    } else {
      data[key] = value.replace(/^"|"$/g, '');
    }
  }
  return {data, body: match![2]};
}

const slugOf = (file: string) => file.replace(/^\d{4}-\d{2}-/, '').replace(/\.mdx$/, '');
const stringValue = (data: Frontmatter, key: string, file: string) => {
  const value = data[key];
  assert.equal(typeof value, 'string', `${file}: ${key} debe ser string`);
  return value as string;
};
const filesOf = (dir: string) => readdirSync(dir).filter((name) => name.endsWith('.mdx')).sort();

test('plataforma: el slug público no lleva el prefijo de fecha del archivo (#156/#157)', () => {
  // Contrato de URL (`docs/BLOG-PROPUESTA.md` y `content/blog/README.md`): el
  // slug es el nombre del archivo SIN la fecha; el canonical de los artículos
  // es `https://<host>/<slug>`. Si el prefijo AAAA-MM- llega al slug, las URLs
  // y el canonical no coinciden (404 en buscadores).
  for (const section of ['empresa', 'producto'] as const) {
    for (const post of listPosts(section, {includeDrafts: true})) {
      assert(!/^\d{4}-\d{2}-/.test(post.slug), `${section}/${post.slug}: el slug público no lleva la fecha (nombre del archivo sin AAAA-MM-)`);
    }
  }
});

for (const [blog, config] of Object.entries(BLOGS)) {
  test(`blog ${blog}: contrato de plataforma en los .mdx (#156/#157)`, () => {
    const files = filesOf(config.dir);
    assert(files.length >= RONDA[blog as keyof typeof BLOGS].length, `${blog}: faltan artículos`);
    for (const file of files) {
      const {data, body} = frontmatter(readFileSync(join(config.dir, file), 'utf8'), file);
      const slug = slugOf(file);
      for (const key of ['title', 'description', 'date', 'author', 'categories', 'tags', 'draft']) {
        assert.notEqual(data[key], undefined, `${file}: falta ${key}`);
      }
      const title = stringValue(data, 'title', file);
      const description = stringValue(data, 'description', file);
      const date = stringValue(data, 'date', file);
      stringValue(data, 'author', file);
      // Límites del parser implementado (`app/blog-data.ts`): 4–90 y 40–200.
      assert(title.trim().length >= 10 && title.trim().length <= 90, `${file}: título fuera de rango`);
      assert(description.trim().length >= 40 && description.trim().length <= 200, `${file}: descripción fuera de rango`);
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${file}: date AAAA-MM-DD`);
      assert(file.startsWith(date.slice(0, 7)), `${file}: el nombre debe empezar con el mes de publicación`);
      assert(Array.isArray(data['categories']) && (data['categories'] as string[]).length >= 1, `${file}: categorías no vacías`);
      assert(Array.isArray(data['tags']), `${file}: tags como lista`);
      assert(typeof data['draft'] === 'boolean', `${file}: draft booleano`);

      // `canonical` es opcional (docs/BLOG-PROPUESTA.md: `canonical?`); si se
      // declara, tiene que pertenecer al host del blog.
      if (data['canonical'] !== undefined) {
        const canonical = stringValue(data, 'canonical', file);
        assert(canonical.startsWith(`${config.host}/`) && canonical.endsWith(`/${slug}`), `${file}: canonical del host y slug correctos`);
      }
      // Media [M]: portada con alt obligatorio (a11y); sin portada no aplica.
      const cover = data['cover'];
      assert(cover === undefined || typeof cover === 'string', `${file}: cover string`);
      if (typeof cover === 'string' && cover.trim().length > 0) {
        const coverAlt = stringValue(data, 'coverAlt', file);
        assert(coverAlt.trim().length >= 4, `${file}: alt obligatorio cuando hay portada`);
      }
      // DSN: un solo H1 por página. La plantilla ya dibuja `title` como H1
      // (`app/blog/[section]/[slug]/page.tsx`), así que el cuerpo no debe
      // repetirlo: dos H1 rompen la jerarquía.
      const headings = (body.match(/^# /gm) || []).length;
      assert.equal(headings, 0, `${file}: el cuerpo no lleva H1 (la plantilla dibuja el título)`);
    }
  });

  test(`blog ${blog}: artículos de la ronda — SEO, estructura y CTA`, () => {
    const files = filesOf(config.dir);
    let cross = 0;
    for (const slug of RONDA[blog as keyof typeof BLOGS]) {
      const file = files.find((name) => name.endsWith(`-${slug}.mdx`));
      assert(file, `${blog}: falta el artículo ${slug}`);
      const {data, body} = frontmatter(readFileSync(join(config.dir, file!), 'utf8'), file!);

      const title = stringValue(data, 'title', file!);
      const description = stringValue(data, 'description', file!);
      assert(title.length >= 15 && title.length <= 60, `${file}: title fuera de 15–60 (${title.length})`);
      assert(description.length >= 60 && description.length <= 160, `${file}: description fuera de 60–160 (${description.length})`);
      if (typeof data['seoTitle'] === 'string') assert((data['seoTitle'] as string).length <= 60, `${file}: seoTitle > 60`);

      const categories = data['categories'] as string[];
      assert.equal(categories.length, 1, `${file}: una sola categoría`);
      const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      assert((config.categorias as readonly string[]).map(normalize).includes(normalize(categories[0])), `${file}: categoría válida (${categories[0]})`);
      const tags = data['tags'] as string[];
      assert(tags.length <= 3, `${file}: hasta 3 etiquetas (${tags.length})`);
      const canonical = stringValue(data, 'canonical', file!);
      // Las URLs públicas del blog son `/<slug>` (el middleware reescribe por
      // host; la categoría es una etiqueta visible, no un segmento de URL).
      assert.equal(canonical, `${config.host}/${slug}`, `${file}: canonical esperado del blog`);

      assert(!/^# /m.test(body), `${file}: el cuerpo no repite H1 (lo dibuja la plantilla)`);
      assert(/^## /m.test(body), `${file}: el cuerpo necesita al menos un H2`);
      const words = body.split(/\s+/).filter(Boolean).length;
      assert(words >= 400, `${file}: contenido sustantivo (${words} palabras)`);
      assert(config.cta.test(body), `${file}: falta el CTA del blog`);
      const internal = /\]\(\/[a-z0-9-]+\)/.test(body) || body.includes(`${config.host}/`);
      assert(internal, `${file}: al menos un enlace interno`);
      if (body.includes('utm_medium=cross')) cross += 1;
    }
    assert(cross >= 1, `${blog}: al menos un enlace cruzado entre blogs con UTM`);
  });
}
