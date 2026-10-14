# Platform administration API

This surface is for Scale platform operators, not agency administrators. Every protected route checks the independent `platform_administrators` table; an agency `owner`, `admin`, or other agency role does **not** imply access. Demo sessions are always rejected.

## Bootstrap and configuration

Set exactly one verified, non-demo user email in `SCALE_INITIAL_PLATFORM_ADMIN_EMAIL`. On startup, the server grants that account the initial platform role only if the table is empty and the account already has an active agency membership. It never creates an account, changes a password, or grants a second administrator. `GET /api/platform/bootstrap-status` returns only a safe state (`not_configured`, `invalid_configuration`, `awaiting_eligible_user`, or `initialized`); it does not disclose the configured address and, like every other platform route, sits behind the guard.

## Guard (single entry point)

Every `/api/platform/*` request goes through `platform-router.js`, which runs `actor()` (platform-admin.js) before any handler. The guard re-reads the user from the database on every request (memoized per request): real, non-deleted, non-demo user outside a Demo session, an active row in `platform_administrators`, and a verified email or a Google-linked account. Any failure — no session, wrong role, demo, unverified, deleted, or a database error — returns the same generic `404 {"error":"No encontrado."}`, so the panel's existence is never confirmed. A new panel module registers its handler in `PLATFORM_HANDLERS`; `test-platform-guard.mjs` enumerates every route of every registered module and asserts it is guarded.

## Demo exclusion

Every read in `platform-*.js` filters demos with the single helper in `platform-demo-filter.js` (`realUser`/`realOrganization`, a.k.a. `filtroSinDemo`). `test-platform-guard.mjs` statically fails if a query joins `users`, `organizations` or `agency_usage_sessions` without it (identity-only joins declare `/*demo-ok: reason*/`). Demo activity is not shown in the panel's KPIs, tables or charts.

## Protected endpoints

- `GET /api/platform/metrics?from&to` — Resumen indicators for the period (Asunción days): new agencies, new users, active users, sessions, landing inquiries and coupon redemptions, each with the previous equal-length period, the daily series and `has_data` (false when the source has no real rows yet).

- `GET /api/platform/agencies` — paginated agencies with active user count and subscription summary, excluding demos.
- `GET /api/platform/agencies/:id/subscription` — non-provider-secret subscription data plus its manual internal state.
- `PATCH /api/platform/agencies/:id/subscription` — sets `state` to `active` or `suspended`, a 3–280 character `reason`, and optional future UTC `expires_at`; send `{ "state": null }` to remove the manual state. The target must already have an internal subscription. Changes are atomic and audited.
- `GET /api/platform/coupons`, `POST /api/platform/coupons`, `PATCH /api/platform/coupons/:id` — manages internally defined coupons. `lifetime_eligible` is an explicit boolean and deactivation uses `active: false`.
- `GET /api/platform/audit` — paginated administrative mutation history, including the one-time bootstrap grant.

Manual subscription state changes application access only. They never call Stripe, write provider identifiers/statuses, create a checkout, invoice, payment, customer, or subscription, and they require a reason plus an audit row.

## Remaining work

Coupon redemption and lifetime-plan purchase/claim flows are intentionally absent. Before enabling payment collection, configure and verify Stripe separately using `STRIPE-SETUP.md`, decide the redemption/entitlement rules, and add a payment-provider integration with its own tests and operational approval.
