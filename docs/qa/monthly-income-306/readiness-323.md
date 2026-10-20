# Monthly-income browser readiness — Refs #323

The main CI failed at `Agregar servicio extra`: the harness waited for
`.client-monthly-income`, which mounts before the monthly GET response.
The editor correctly shows loading and withholds write actions until
`canManage` is known. Waiting for the requested visible, enabled action
fixes the harness without changing the product or skipping assertions.

Validation on Chromium, with the real editor/CSS and synthetic API:

- PRE: delaying synthetic GET responses 600 ms reproduces exactly
  `Missing button Agregar servicio extra`.
- POST: the same delay passes all nine 320/390/1440 × light/dark/contrast cases.
- Normal `node build-tools/qa-client-income-306.mjs`: all nine cases pass.
- `node --check build-tools/qa-client-income-306.mjs`: passes.

The delayed control bundles the existing fixture unchanged except for adding
`if(!init.body)await new Promise(resolve=>setTimeout(resolve,600));` before
`const url=String(input);` in its fetch implementation. The PRE control uses
the harness from main ea11844b; POST uses this change. Delays only affect the
synthetic transport, not browser scheduling or application code.

All original checks remain: required fields do not write, create without a
plan, update revision, audited deletion, refresh callbacks, responsive bounds,
Escape/focus return, and no runtime errors. The existing ten-second timeout
still fails if an expected action never becomes available. No production API,
physical mobile device, Safari, build, release or deployment is accredited.
