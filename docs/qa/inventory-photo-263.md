# Inventory photos: absolute URL round-trip (#263)

The regression was reproduced before the fix on the release 194 baseline
`f2d52f5e`. A catalogue GET behind an HTTPS proxy returned an absolute photo
endpoint. PATCHing the name with that URL replaced the stored WebP data URL
with the endpoint URL. The assertion that the stored bytes remained unchanged
failed; the previous GET photo route redirected back to that endpoint.

## Result

The same item may return its relative `/api/agency/inventory/:id/photo`,
`/core-api/api/agency/inventory/:id/photo`, or absolute reference without changing
its stored image or photo timestamp, including timestamp zero. Absolute origins
must match the validated current request/proxy origin, the configured APP_URL or
PUBLIC_ORIGIN, or the canonical Scale application/API origin. New internal links
across items and links without an existing image are rejected. An HTTPS image
on an unrelated origin remains an external source, including an identical path;
it is never fetched by the server.

Legacy internal endpoint references never produce redirects. An authenticated,
visible self-reference can serve its original raster bytes read-only when the
last photo transition in `agency_operation_audit` proves exactly that overwrite:

- organization, table and item agree in the record and both audit snapshots;
- the latest photo-changing event is UPDATE and its after value equals the
  current stored reference;
- the audit timestamp exactly equals the current photo timestamp in PostgreSQL;
- the before value is a raster accepted by the existing image policy.

The validator's re-encoded output is not served; the original recorded bytes
are returned. Neither the item nor its history is rewritten. Name-only updates
leave that evidence usable. A clear, subsequent replacement, INSERT/DELETE,
invalid image, mismatched timestamp, missing/pruned evidence or cross-item link
prevents fallback; the response is 422 without Location. Historical external URLs
are not recovered. Normal current external HTTPS sources still return 302.

This does not claim recovery for any production record: availability depends on
its retained audit evidence. No production database or external image service was
accessed during validation.

## Validation

A shared real-localhost HTTP matrix runs in both suites, using actual request
headers, JSON bodies and redirect handling (`manual` and `follow`). It verifies
proxy GET -> full-record name PATCH -> identical image bytes, direct and core-api
references, original stamps, recovery boundaries, external redirects, uploads,
clear/null, unauthenticated/viewer access, tenant isolation and archive/restore.
External redirects are inspected with `manual`; they are never followed.

- `node backend/test-inventory-reservations.mjs`: PASS, HTTP matrix plus 236
  existing PGlite handler cases.
- `SCALE_TEST_PG_BIN=/workspace/.qa-tools/postgres/usr/lib/postgresql/17/bin SCALE_TEST_PG_PORT=55455 node backend/test-inventory-postgres.mjs`:
  PASS, the same HTTP matrix against PostgreSQL 17.11, seven handler concurrency
  races and the direct exclusion-constraint race. The isolated cluster was stopped
  and removed by the runner.
- `node --check` for the four changed JavaScript modules: PASS.
- `git diff --check`: PASS.

Local diagnostic logs: `/tmp/scale263-before.log`, `/tmp/scale263-pglite.log`,
`/tmp/scale263-postgres.log`. CI and deployment remain the integrator's gates.
