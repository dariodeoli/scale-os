# Public pages responsive QA — Refs #325

Validated the integrated documentation on the local Next development server,
with the product components, styles and assets. No production writes occurred.

- `QA_DOCS_URL=http://127.0.0.1:3307 node build-tools/qa-public-docs-325.mjs`:
  **24 cases PASS**: three routes × 320/390/768/1440 × light/dark.
- All documentation routes return 200 without login, have one H1/main, named
  links, valid fragments and canonical URLs on `sistema.scaleparaguay.com`.
- Keyboard skip link and TOC work. Heading targets remain below any sticky
  header. Tables/code stay within the viewport; no horizontal page overflow,
  broken images, runtime errors or write requests were observed.
- Explicit theme selection waits for finite CSS transitions. Recorded
  backgrounds differ: light `rgb(250, 249, 252)`, dark `rgb(23, 18, 28)`.
- Expanded `tests/landing-responsive-browser-265.test.mjs` on the final landing
  source: all original **20 fragment navigations PASS**, retaining 1024 px in
  addition to the documentation widths. Header positions survive live resize.
- Landing assertions also cover H1, named links, signup/demo/login destinations,
  three documentation entries, MCP section, native FAQ keyboard operation and
  one successful synthetic contact request (including consent and honeypot).
  Contact/telemetry are intercepted locally; the production API is never called.
- Both browser scripts pass `node --check`.

The landing test is registered in `99-public-docs-325.list`. Documentation
browser QA runs separately after starting Next; it is deliberately absent from
prebuild regression, which has no local server. `QA_DOCS_URL` only accepts a
loopback host. Root owns production build, host routing, CI and deploy checks.

Six review screenshots were saved under `/tmp`: landing 390/1440, documentation
home 390/1440 and MCP guide 390/1440, with visible assets loaded. JSON results:
`/tmp/scale325-public-docs/results.json`. These are session evidence, not shipped
assets. The screenshots use light theme; both palettes were checked in browser.

Limits: Chromium viewport emulation, not physical devices or Safari. Claude and
ChatGPT UI connections remain unverified externally (#312). Browser geometry
and protocol documentation do not certify those external integrations.

Production-build verification also passed all24 browser cases, using the same
source and production CSS. Production ETags initially produced conditional304
responses; the harness now disables browser cache for these status checks so
each case verifies a fresh200, retaining every content/keyboard/layout assertion.
Local HTTP additionally verified the three canonical-host documentation routes,
font and sitemap (5checks), with version1.0.202 and public indexing. The strict-host
landing rewrite is verified by routing/static-browser tests and by the final
public deployment; a localhost Next server rewrites that handler onto localhost.
