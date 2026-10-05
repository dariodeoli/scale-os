import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {after, before, mock, test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {create} from 'react-test-renderer';
import postcss from 'postcss';
import {BLOG_SECTIONS, listPosts, postPath} from '../app/blog-data';
import {BLOG_ORIGINS} from '../app/seo';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const {default: BlogIndex} = require('../app/blog/[section]/page') as typeof import('../app/blog/[section]/page');
const {BlogListTemplate} = require('../app/blog-templates') as typeof import('../app/blog-templates');
const browserDescriptors = ['self', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
before(() => {
  Object.defineProperties(globalThis, {self: {value: globalThis, configurable: true}, window: {value: globalThis, configurable: true}});
  mock.timers.enable({apis: ['Date'], now: Date.parse('2026-10-05T15:00:00Z')});
});
after(() => {
  mock.timers.reset();
  for (const [key, descriptor] of browserDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test('both live indexes use one featured post and preserve every public content field and route', async () => {
  for (const section of BLOG_SECTIONS) {
    const posts = listPosts(section);
    const element = await BlogIndex({params: Promise.resolve({section})});
    const renderer = create(element);
    try {
      const html = renderToStaticMarkup(element);
      assert.equal(renderer.root.findAllByType('main').length, 0, 'the existing layout owns main');
      assert.equal(renderer.root.findAllByType('h1').length, 1);
      assert.equal(renderer.root.findAllByType('article').length, posts.length);
      assert.equal(renderer.root.findAllByProps({className: 'blog-featured'}).length, 1);
      assert.equal(renderer.root.findAllByProps({className: 'blog-card'}).length, posts.length - 1);
      assert.equal(renderer.root.findByProps({className: 'blog-featured'}).findByType('h2').children.join(''), posts[0].title);
      const links = renderer.root.findAllByType('a').map(node => node.props.href);
      assert.ok(links.includes('/rss.xml'));
      assert.ok(links.includes(`${BLOG_ORIGINS[section]}/sitemap.xml`));
      assert.ok(!links.some(href => href.includes('/categoria/')), 'no dormant category routes');
      for (const post of posts) {
        assert.equal(links.filter(href => href === postPath(post)).length, 1, 'one focus target per post');
        for (const value of [post.title, post.description, post.author, ...post.categoryNames, ...post.tags]) {
          assert.ok(html.includes(renderToStaticMarkup(<>{value}</>)), `${section}: preserves ${value}`);
        }
        assert.equal(renderer.root.findAllByType('time').filter(node => node.props.dateTime === post.date).length, posts.filter(item => item.date === post.date).length);
        const [year, month, day] = post.date.split('-').map(Number);
        const label = new Intl.DateTimeFormat('es-PY', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(Date.UTC(year, month - 1, day, 12)));
        assert.ok(renderer.root.findAllByType('time').some(node => node.props.dateTime === post.date && node.children.join('') === label), 'original civil-date display is preserved');
      }
      for (const post of listPosts(section, {includeDrafts: true}).filter(post => post.draft || post.date > '2026-10-05')) {
        assert.ok(!links.includes(postPath(post)), 'embargo remains at the real route');
      }
      for (const image of renderer.root.findAllByType('img')) {
        assert.ok(image.props.src.startsWith('/') && existsSync(`public${image.props.src}`));
        assert.ok(image.props.alt.length >= 4);
        assert.equal(image.props.width, 1200);
        assert.equal(image.props.height, 630);
      }
    } finally {renderer.unmount();}
  }
});

test('embedded template uses branded fallback without empty media links or fabricated images', () => {
  const source = listPosts('empresa')[0];
  const post = {slug: source.slug, title: source.title, excerpt: source.description, date: source.date, author: source.author, category: {slug: source.categories[0], label: source.categoryNames[0]}, tags: source.tags};
  const renderer = create(<BlogListTemplate embedded variant="empresa" title="Historias de la agencia" description="Casos, cultura y noticias del equipo." posts={[post]} basePath=""/>);
  try {
    assert.equal(renderer.root.findAllByType('img').length, 0);
    assert.equal(renderer.root.findAllByType('a').length, 1);
    assert.equal(renderer.root.findByProps({className: 'blog-cover-fallback'}).props['aria-hidden'], 'true');
    assert.ok(renderToStaticMarkup(<BlogListTemplate embedded title="Historias" description="Noticias" posts={[post]} basePath=""/>).includes('Scale Paraguay'));
  } finally {renderer.unmount();}
  const empty = renderToStaticMarkup(<BlogListTemplate embedded title="Historias" description="Noticias" posts={[]}/>);
  assert.ok(empty.includes('role="status"'));
  assert.ok(!empty.includes('blog-featured'));
});

test('template styles are scoped away from live detail pages and retain focus and responsive contracts', () => {
  const css = readFileSync('app/blog-templates.css', 'utf8');
  postcss.parse(css).walkRules(rule => {
    for (const selector of rule.selectors) assert.match(selector, /^\.blog-page(?:[\s.:]|$)/, `unscoped selector: ${selector}`);
  });
  assert.match(css, /:focus-visible/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(readFileSync('app/blog-templates.tsx', 'utf8'), /from ["']owncoding-ui["']/, 'server templates must not call client-entry utilities');
});
