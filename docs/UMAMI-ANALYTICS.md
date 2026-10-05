# Public Umami support (Refs #158)

Status: support only; this change does not provision Umami, set production IDs,
activate tracking, deploy, or change the privacy notice. Analytics stays off by
omission. Obtain the necessary operational/legal approval before setting variables.

## Runtime configuration

Set these on the frontend runtime, not as Docker build arguments or NEXT_PUBLIC variables:

| Variable | Meaning |
| --- | --- |
| `UMAMI_ORIGIN` | Dedicated HTTPS Umami origin, e.g. `https://stats.example.com` |
| `UMAMI_LANDING_WEBSITE_ID` | UUID for `sistema.scaleparaguay.com` |
| `UMAMI_COMPANY_BLOG_WEBSITE_ID` | UUID for `blog.scaleparaguay.com` |
| `UMAMI_PRODUCT_BLOG_WEBSITE_ID` | UUID for `producto.scaleparaguay.com` |

The origin must be root-only, with no credentials, query, fragment, nondefault
port, IP literal, local hostname or public frontend host. Each surface requires
its own valid UUID and valid shared origin. Missing/invalid values render no
bootstrap and load no analytics script. One missing ID disables only that surface.
App, admin, cliente, preview, localhost and nonstandard host ports are excluded.
Forwarded host headers cannot opt a request in.

## Same-origin and data contract

- The landing middleware rewrites `/` to a runtime HTML handler reading the existing
  `public/scale-os.html`; disabled output is byte-for-byte unchanged. Blog chrome
  reads request headers at runtime. This keeps runtime env changes out of builds.
- Configured public pages emit an inline guard; it checks the actual HTTPS host and
  navigator/window DNT before loading `/public-analytics/loader.js`. DNT headers
  also suppress the server bootstrap, loader response and collector.
- A small local sender posts only `{path}` to `/public-analytics/collect`; it does
  not load upstream SDK code. Initial views, history navigation and popstate are
  deduplicated by pathname. Search/hash-only changes send nothing.
- Only `/` on the landing and `/`/currently published slugs on each blog qualify.
  Drafts, future articles, demo, workspace, client, unknown and private paths never
  qualify. Referrers, search/hash, titles, click/custom events, custom data and
  identify/distinct-user IDs are neither read nor forwarded.
- The collector reconstructs the server-owned website/hostname and pathname. It
  sends the documented Umami pageview shape (`type: event`, no event name) to the
  fixed `/api/send` endpoint. Client cookies, auth, IP/forwarded headers, upstream
  cookies and cache/session responses are not forwarded. Only User-Agent and JSON
  Content-Type accompany the upstream request. Anonymous session accuracy is
  limited because the provider sees the proxy IP rather than the visitor IP.
- Same-origin scripts and requests fit the existing CSP; no extra script/connect
  domains or relaxed directives are added. Responses are private/no-store; bodies
  are bounded to 2 KiB; upstream redirects are rejected and timeout is 5 seconds.
  Failed analytics requests never interrupt navigation or expose provider output.

Blog indexes/details now render with request-scoped chrome. Post static params
still enumerate only published slugs at build time (`dynamicParams: false`); a new
build is needed to make a newly scheduled detail route available. RSS/sitemap
remain build-generated. The shared publication selector also guards runtime reads.

## Verification and rollback

`npx tsx tests/umami-analytics.test.ts` uses VM browser stubs and mocked fetch:
no network, credentials, provider or real analytics events are needed. It is also
registered in the release regression chain. Follow the repository release/build
checks before integration; no production smoke or provider acceptance is implied.

Disable a surface by removing its UUID; remove `UMAMI_ORIGIN` to disable all
surfaces, then restart the frontend runtime. Rollback the analytics work-unit
commit to remove its handlers and restore the static landing/blog chrome; the
publication embargo commit is independent and must remain intact.

Protocol references: [Umami sending stats](https://docs.umami.is/docs/api/sending-stats)
and [tracker configuration](https://docs.umami.is/docs/tracker-configuration).
