import React from "react";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {create, type ReactTestRenderer} from "react-test-renderer";

Object.assign(globalThis, {React});
require.extensions[".css"] = () => {};

const {BlogListTemplate, BlogArticleTemplate, blogArticleJsonLd} = require("../app/blog-templates") as typeof import("../app/blog-templates");
const css = readFileSync(new URL("../app/blog-templates.css", import.meta.url), "utf8");
const source = readFileSync(new URL("../app/blog-templates.tsx", import.meta.url), "utf8");
const text = (node: unknown): string => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : "";

const category = {slug: "procesos", label: "Procesos", count: 4};
const posts = [
  {slug: "orden-de-produccion", title: "Orden de producción: el hábito que cambia la semana", excerpt: "Cómo priorizar piezas y responsables sin planillas paralelas.", date: "2026-09-18", author: "Lucía Acosta", category, readingMinutes: 6, cover: "/landing/producir.jpg", coverAlt: "Tablero de producción"},
  {slug: "cobrar-a-tiempo", title: "Cobrar a tiempo sin perseguir clientes", excerpt: "Recordatorios, mora y seguimiento en un solo lugar.", date: "2026-09-10", author: "Martín Benítez", category: {slug: "finanzas", label: "Finanzas"}, readingMinutes: 5},
  {slug: "portal-del-cliente", title: "El portal del cliente, explicado", excerpt: "Aprobaciones por enlace privado y menos idas y vueltas.", date: "2026-09-02", author: "Sofía Ramírez", category: {slug: "clientes", label: "Clientes"}},
];

test("#156/#157: la lista del blog es accesible, indexable y con marca por variante", () => {
  let list!: ReactTestRenderer;
  list = create(<BlogListTemplate title="Blog de Scale Paraguay" description="Ideas para agencias que producen y cobran mejor." posts={posts as never} categories={[category, {slug: "finanzas", label: "Finanzas", count: 2}]} activeCategory="procesos" basePath="/blog" rssHref="/blog/rss.xml"/>);
  const json = JSON.stringify(list.toJSON());
  assert.match(json, /blog--empresa/, "la variante empresa tiñe el acento");
  assert.equal((json.match(/"h1"/g) || []).length, 1, "un solo H1");
  assert.match(json, /"type":"time"[^}]*dateTime":"2026-09-18"/, "la fecha va en <time>");
  assert.match(json, /aria-current":"page"/, "la categoría activa se anuncia");
  assert.match(json, /application\/rss\+xml/, "el enlace RSS se declara");
  const imgs = list.root.findAllByType("img");
  for (const img of imgs) {
    assert(img.props.alt !== undefined, "toda imagen declara alt");
    assert.equal(img.props.width, 1200);
    assert.equal(img.props.height, 630);
    assert.equal(img.props.loading, "lazy");
  }
  list.unmount();

  list = create(<BlogListTemplate variant="producto" title="Novedades de Scale OS" description="Changelog, guías y casos." posts={posts as never} basePath="/novedades"/>);
  assert.match(JSON.stringify(list.toJSON()), /blog--producto/, "la variante producto usa su acento");
  list.unmount();
});

test("#156/#157: el artículo ordena la lectura con breadcrumb, meta y relacionados", () => {
  const post = {...posts[0], tags: ["producción", "equipo"], updated: "2026-09-20"};
  const renderer = create(<BlogArticleTemplate post={post as never} related={posts.slice(1) as never} basePath="/blog" siteUrl="https://blog.scaleparaguay.com">
    <h2>Un tablero, una verdad</h2>
    <p>El tablero reemplaza el ida y vuelta por WhatsApp.</p>
  </BlogArticleTemplate>);
  const json = JSON.stringify(renderer.toJSON());
  assert.equal((json.match(/"h1"/g) || []).length, 1, "un solo H1 en el artículo");
  assert.match(json, /aria-label":"Navegación del artículo"/);
  assert.match(json, /aria-label":"Etiquetas del artículo"/);
  assert.match(json, /dateTime":"2026-09-20"/, "la fecha de actualización es visible");
  assert.match(json, /Seguí leyendo/);
  assert.match(json, /blog-prose/);
  const related = renderer.root.findAllByType("h3");
  assert(related.length >= 2, "los relacionados muestran títulos");
  renderer.unmount();
});

test("#156/#157: el helper JSON-LD emite Article + BreadcrumbList con datos reales", () => {
  const jsonLd = blogArticleJsonLd({...posts[0], tags: []} as never, {siteUrl: "https://blog.scaleparaguay.com", siteName: "Scale Paraguay", basePath: "/blog", logoUrl: "https://scaleparaguay.com/brand/icon-512.png"});
  const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;
  const article = graph.find((item) => item["@type"] === "Article")!;
  assert.equal(article.headline, posts[0].title);
  assert.equal(article.datePublished, "2026-09-18");
  assert.equal((article.author as {name: string}).name, "Lucía Acosta");
  assert.equal(article.articleSection, "Procesos");
  const breadcrumb = graph.find((item) => item["@type"] === "BreadcrumbList")! as {itemListElement: Array<{name: string}>};
  assert.deepEqual(breadcrumb.itemListElement.map((item) => item.name), ["Blog", "Procesos", posts[0].title]);
});

test("#156/#157: el contrato de lectura y a11y vive en la hoja de marca", () => {
  assert.match(css, /max-width:70ch/, "ancho de lectura acotado");
  assert.match(css, /min-height:44px/, "targets de 44 px en controles");
  assert.match(css, /:focus-visible\{outline:3px solid/, "foco visible AA");
  assert.match(css, /prefers-reduced-motion:reduce/, "respeta movimiento reducido");
  assert.match(source, /export function BlogListTemplate/);
  assert.match(source, /export function BlogArticleTemplate/);
  assert.match(source, /export function blogArticleJsonLd/);
  assert.match(source, /itemType="https:\/\/schema\.org\/Article"/, "microdatos de artículo en el marcado");
  assert.match(source, /loading="lazy" decoding="async"/, "imágenes diferidas con dimensiones");
});
