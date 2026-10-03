import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {test} from 'node:test';
import {join} from 'node:path';

// Contenido inicial de los blogs (ronda #156/#157, Fase 1 MDX): valida el
// contrato de frontmatter acordado con PLT (`docs/blog/frontmatter-fase1.md`),
// el SEO on-page mínimo y el CTA de cada blog. Sin dependencias de YAML: el
// subconjunto usado es plano (strings, arrays y booleanos).

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

const stringValue = (data: Frontmatter, key: string, file: string) => {
  const value = data[key];
  assert.equal(typeof value, 'string', `${file}: ${key} debe ser string`);
  return value as string;
};

for (const [blog, config] of Object.entries(BLOGS)) {
  test(`blog ${blog}: frontmatter, SEO on-page y CTA del contenido inicial (#156/#157)`, () => {
    const files = readdirSync(config.dir).filter((name) => name.endsWith('.mdx')).sort();
    assert(files.length >= 3, `${blog}: se esperan al menos 3 artículos iniciales`);
    const slugs = new Set<string>();
    let cross = 0;
    for (const file of files) {
      const raw = readFileSync(join(config.dir, file), 'utf8');
      const {data, body} = frontmatter(raw, file);
      const slug = file.replace(/^\d{4}-\d{2}-/, '').replace(/\.mdx$/, '');
      assert(!slugs.has(slug), `${file}: slug duplicado`);
      slugs.add(slug);

      const title = stringValue(data, 'title', file);
      const description = stringValue(data, 'description', file);
      const date = stringValue(data, 'date', file);
      const author = stringValue(data, 'author', file);
      const canonical = stringValue(data, 'canonical', file);
      const categories = data['categories'];
      const tags = data['tags'];
      assert(typeof data['draft'] === 'boolean', `${file}: draft booleano obligatorio`);
      assert(typeof data['cover'] === 'string' && typeof data['coverAlt'] === 'string', `${file}: cover/coverAlt declarados (pueden estar vacíos)`);
      assert.equal(data['seoTitle'] === undefined || typeof data['seoTitle'] === 'string', true, `${file}: seoTitle opcional`);

      assert(title.length >= 15 && title.length <= 60, `${file}: title fuera de 15–60 (${title.length})`);
      assert(description.length >= 60 && description.length <= 155, `${file}: description fuera de 60–155 (${description.length})`);
      if (typeof data['seoTitle'] === 'string') assert((data['seoTitle'] as string).length <= 60, `${file}: seoTitle > 60`);
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${file}: date AAAA-MM-DD`);
      assert(file.startsWith(date.slice(0, 7)), `${file}: el nombre debe empezar con el mes de publicación`);
      assert(author.trim().length > 2, `${file}: autor con nombre`);
      assert(Array.isArray(categories) && categories.length === 1, `${file}: una sola categoría`);
      assert(config.categorias.includes((categories as string[])[0]), `${file}: categoría válida (${(categories as string[])[0]})`);
      assert(Array.isArray(tags) && (tags as string[]).length <= 3, `${file}: hasta 3 etiquetas`);
      assert.equal(canonical, `${config.host}/${(categories as string[])[0]}/${slug}`, `${file}: canonical esperado del blog`);

      assert(!/^# /m.test(body), `${file}: el cuerpo no repite H1 (lo dibuja la plantilla)`);
      assert(/^## /m.test(body), `${file}: el cuerpo necesita al menos un H2`);
      const words = body.split(/\s+/).filter(Boolean).length;
      assert(words >= 400, `${file}: contenido sustantivo (${words} palabras)`);
      assert(config.cta.test(body), `${file}: falta el CTA del blog`);
      const ownLinks = body.match(new RegExp(`${config.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[a-z-]+/|\\/(?:servicios|guias)\\/`, 'g')) || [];
      assert(ownLinks.length >= 1, `${file}: al menos un enlace interno`);
      if (body.includes('utm_medium=cross')) cross += 1;
    }
    assert(cross >= 1, `${blog}: al menos un enlace cruzado entre blogs con UTM`);
  });
}
