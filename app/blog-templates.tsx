// Plantillas del blog (Refs #156/#157): lista y artículo listos para que PLT
// arme las rutas/hosts y lea `content/blog/**`. Presentacionales y sin estado:
// la app aporta los datos (frontmatter MDX) y estas piezas el sistema de marca.
// Misma base para los dos blogs; `variant` cambia el acento (empresa | producto).
import "./blog-templates.css";

export type BlogVariant = "empresa" | "producto";
export type BlogCategory = {slug: string; label: string; count?: number};
export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  /** Fecha ISO (YYYY-MM-DD) del frontmatter. */
  date: string;
  author: string;
  category: BlogCategory;
  readingMinutes?: number;
  cover?: string | null;
  coverAlt?: string | null;
  tags?: string[];
};
export type BlogPost = BlogPostSummary & {updated?: string | null; tags?: string[]};

const SITE: Record<BlogVariant, {name: string; home: string; cta: {label: string; href: string}}> = {
  empresa: {name: "Scale Paraguay", home: "https://scaleparaguay.com/", cta: {label: "Conocer Scale OS ↗", href: "https://sistema.scaleparaguay.com/"}},
  producto: {name: "Scale OS", home: "https://sistema.scaleparaguay.com/", cta: {label: "Probar Scale OS ↗", href: "https://app.scaleparaguay.com/registro"}},
};

function longDate(value: string) {
  // Frontmatter dates are civil days, not UTC instants; retain the live format.
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PY", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"})
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function readingLabel(post: Pick<BlogPostSummary, "readingMinutes">) {
  return post.readingMinutes ? `${post.readingMinutes} min de lectura` : null;
}

function Meta({post, as = "p"}: {post: BlogPostSummary; as?: "p" | "div"}) {
  const Tag = as;
  return <Tag className="blog-meta">
    <time dateTime={post.date}>{longDate(post.date)}</time>
    <span aria-hidden="true">·</span>
    <span>{post.author}</span>
    {readingLabel(post) ? <><span aria-hidden="true">·</span><span>{readingLabel(post)}</span></> : null}
  </Tag>;
}

/** Portada de la tarjeta: dimensiones explícitas para no aportar CLS. */
function Cover({post, sizes}: {post: BlogPostSummary; sizes: string}) {
  if (!post.cover) return null;
  return <img className="blog-cover" src={post.cover} alt={post.coverAlt || ""} width={1200} height={630} sizes={sizes} loading="lazy" decoding="async"/>;
}

function CardTags({post}: {post: BlogPostSummary}) {
  return post.tags?.length ? <ul className="blog-tags" aria-label="Etiquetas">
    {post.tags.map(tag => <li key={tag}><span className="blog-chip">{tag}</span></li>)}
  </ul> : null;
}

function CardCover({post, variant, sizes}: {post: BlogPostSummary; variant: BlogVariant; sizes: string}) {
  return post.cover ? <Cover post={post} sizes={sizes}/> : <div className="blog-cover-fallback" aria-hidden="true">
    <span>{SITE[variant].name}</span><span>{post.category.label}</span>
  </div>;
}

export function BlogListTemplate({variant = "empresa", title, description, posts, categories = [], activeCategory = "", basePath = "/blog", rssHref, sitemapHref, embedded = false}: {
  variant?: BlogVariant;
  title: string;
  description: string;
  posts: BlogPostSummary[];
  categories?: BlogCategory[];
  activeCategory?: string;
  basePath?: string;
  rssHref?: string;
  sitemapHref?: string;
  embedded?: boolean;
}) {
  const site = SITE[variant];
  const [featured, ...rest] = posts;
  const Root = embedded ? "section" : "main";
  return <Root className={`blog-page blog--${variant} ${embedded ? "blog-embedded" : "control-shell"}`} aria-labelledby="blog-title">
    {!embedded ? <header className="blog-header">
      <a className="blog-site" href={site.home} aria-label={`${site.name}, inicio`}>{site.name}</a>
      <a className="blog-cta" href={site.cta.href}>{site.cta.label}</a>
    </header> : null}

    <section className="blog-hero" aria-labelledby="blog-title">
      <p className="blog-eyebrow">{embedded ? variant === "empresa" ? "Scale Paraguay" : "Scale OS · Producto" : "Blog"}</p>
      <h1 id="blog-title">{title}</h1>
      <p className="blog-lead">{description}</p>
      {categories.length && embedded ? <p className="blog-categories" aria-label="Categorías">
        {categories.map(category => <span key={category.slug} className="blog-chip">{category.label}</span>)}
      </p> : categories.length ? <nav className="blog-categories" aria-label="Categorías del blog">
        <a href={basePath} aria-current={activeCategory ? undefined : "page"} className={activeCategory ? "" : "is-active"}>Todas</a>
        {categories.map((category) => <a key={category.slug} href={`${basePath}/categoria/${category.slug}`} aria-current={activeCategory === category.slug ? "page" : undefined} className={activeCategory === category.slug ? "is-active" : ""}>
          {category.label}{typeof category.count === "number" ? <span className="blog-count">{category.count}</span> : null}
        </a>)}
      </nav> : null}
      {rssHref && !embedded ? <a className="blog-rss" href={rssHref} type="application/rss+xml">RSS</a> : null}
    </section>

    {featured ? <article className="blog-featured">
      <a className="blog-featured-link" href={`${basePath}/${featured.slug}`}>
       <div className="blog-featured-body">
        <span className="blog-chip">{featured.category.label}</span>
        <h2>{featured.title}</h2>
        <p>{featured.excerpt}</p>
        <Meta post={featured}/>
        <CardTags post={featured}/>
       </div>
       <div className="blog-featured-cover">
        <CardCover post={featured} variant={variant} sizes="(max-width: 767px) 100vw, 34rem"/>
       </div>
      </a>
    </article> : <p className="blog-empty" role="status">Todavía no hay artículos publicados.</p>}

    {rest.length ? <section aria-labelledby="blog-latest-title">
      <h2 id="blog-latest-title" className="blog-section-title">Últimos artículos</h2>
      <div className="blog-grid">
        {rest.map((post) => <article className="blog-card" key={post.slug}>
          <a className="blog-card-link" href={`${basePath}/${post.slug}`}>
            <CardCover post={post} variant={variant} sizes="(max-width: 767px) 100vw, 34rem"/>
            <span className="blog-chip">{post.category.label}</span>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <Meta post={post} as="div"/>
            <CardTags post={post}/>
          </a>
        </article>)}
      </div>
    </section> : null}

    {embedded ? <p className="blog-index-feeds">
      {rssHref ? <a href={rssHref} type="application/rss+xml">RSS</a> : null}
      {sitemapHref ? <a href={sitemapHref}>Sitemap</a> : null}
    </p> : <footer className="blog-footer">
      <p>{site.name} · <a href={site.cta.href}>{site.cta.label}</a></p>
    </footer>}
  </Root>;
}

export function BlogArticleTemplate({variant = "empresa", post, related = [], basePath = "/blog", siteUrl = "", children}: {
  variant?: BlogVariant;
  post: BlogPost;
  related?: BlogPostSummary[];
  basePath?: string;
  /** URL absoluta canónica del artículo (para breadcrumbs accesibles). */
  siteUrl?: string;
  children: React.ReactNode;
}) {
  const site = SITE[variant];
  const canonical = siteUrl ? `${siteUrl.replace(/\/$/, "")}${basePath}/${post.slug}` : `${basePath}/${post.slug}`;
  return <main className={`blog-page blog--${variant} control-shell`}>
    <header className="blog-header">
      <a className="blog-site" href={site.home} aria-label={`${site.name}, inicio`}>{site.name}</a>
      <a className="blog-cta" href={site.cta.href}>{site.cta.label}</a>
    </header>

    <article className="blog-article" itemScope itemType="https://schema.org/Article">
      <nav className="blog-breadcrumb" aria-label="Navegación del artículo">
        <a href={basePath}>Blog</a><span aria-hidden="true">/</span>
        <a href={`${basePath}/categoria/${post.category.slug}`}>{post.category.label}</a>
      </nav>
      <header className="blog-article-head">
        <span className="blog-chip">{post.category.label}</span>
        <h1 itemProp="headline">{post.title}</h1>
        <p className="blog-lead" itemProp="description">{post.excerpt}</p>
        <p className="blog-meta">
          <time dateTime={post.date} itemProp="datePublished">{longDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span itemProp="author">{post.author}</span>
          {readingLabel(post) ? <><span aria-hidden="true">·</span><span>{readingLabel(post)}</span></> : null}
          {post.updated ? <><span aria-hidden="true">·</span><span>Actualizado <time dateTime={post.updated}>{longDate(post.updated)}</time></span></> : null}
        </p>
        {post.cover ? <div className="blog-article-cover"><Cover post={post} sizes="(max-width: 1100px) 100vw, 1100px"/></div> : null}
      </header>

      <div className="blog-prose" itemProp="articleBody">{children}</div>

      {post.tags?.length ? <ul className="blog-tags" aria-label="Etiquetas del artículo">
        {post.tags.map((tag) => <li key={tag}><span className="blog-chip">{tag}</span></li>)}
      </ul> : null}
    </article>

    {related.length ? <section aria-labelledby="blog-related-title">
      <h2 id="blog-related-title" className="blog-section-title">Seguí leyendo</h2>
      <div className="blog-grid">
        {related.slice(0, 3).map((item) => <article className="blog-card" key={item.slug}>
          <a className="blog-card-link" href={`${basePath}/${item.slug}`}>
            <span className="blog-chip">{item.category.label}</span>
            <h3>{item.title}</h3>
            <p>{item.excerpt}</p>
            <Meta post={item} as="div"/>
          </a>
        </article>)}
      </div>
    </section> : null}

    <aside className="blog-cta-box">
      <p><strong>{site.name}</strong> — {variant === "empresa" ? "Agencias que producen, cobran y crecen con orden." : "Producción, clientes, equipo, inventario y finanzas en un solo sistema."}</p>
      <a className="blog-button" href={site.cta.href}>{site.cta.label}</a>
    </aside>

    <footer className="blog-footer">
      <p>{site.name} · <a href={site.cta.href}>{site.cta.label}</a> · <a href={canonical}>Enlace permanente</a></p>
    </footer>
  </main>;
}

/** JSON-LD listo para que la ruta lo inyecte (Article + BreadcrumbList). */
export function blogArticleJsonLd(post: BlogPost, options: {siteUrl: string; siteName: string; basePath?: string; logoUrl?: string}) {
  const basePath = options.basePath || "/blog";
  const url = `${options.siteUrl.replace(/\/$/, "")}${basePath}/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        ...(post.updated ? {dateModified: post.updated} : {}),
        inLanguage: "es-PY",
        author: {"@type": "Person", name: post.author},
        articleSection: post.category.label,
        mainEntityOfPage: url,
        ...(options.logoUrl ? {publisher: {"@type": "Organization", name: options.siteName, logo: {"@type": "ImageObject", url: options.logoUrl}}} : {publisher: {"@type": "Organization", name: options.siteName}}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {"@type": "ListItem", position: 1, name: "Blog", item: `${options.siteUrl.replace(/\/$/, "")}${basePath}`},
          {"@type": "ListItem", position: 2, name: post.category.label, item: `${options.siteUrl.replace(/\/$/, "")}${basePath}/categoria/${post.category.slug}`},
          {"@type": "ListItem", position: 3, name: post.title, item: url},
        ],
      },
    ],
  };
}
