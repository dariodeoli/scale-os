# API — manual operativo (monorepo Scale OS)

Referencia operativa del servicio API dentro del monorepo. Las reglas obligatorias viven en
`../AGENTS.md` (sección «Backend»); el ciclo de release y los servicios, en `../DEPLOYMENT.md`
y `../VERSIONING.md`.

## Servicio

| Qué | Dónde |
| --- | --- |
| Runtime | `node server.js` (Express + Postgres), puerto `PORT` (3000 por defecto) |
| Imagen | `backend/Dockerfile` (node:22-alpine, Chromium para PDFs, `npm ci --omit=dev`) |
| Despliegue | Coolify, servicio API del repo `dariodeoli/scale-os` con **base `backend/`** |
| Dominio | `api.scaleparaguay.com` |
| Salud | `GET /health` → `{ok, database, release:{version, application}}`; 503 mientras la base inicializa |
| Base | Postgres gestionado por Coolify (`DATABASE_URL`, `DATABASE_SSL` si aplica) |

`/` redirige a `https://app.scaleparaguay.com/superadmin` (solo navegación; sin datos).

## Arranque y migraciones

- Al arrancar, el proceso aplica `schema.sql`, la lista curada de `server.js` y lo pendiente
  vía `migrations-runner.mjs` (advisory lock + baseline). No hay paso manual de migración en
  el deploy; si la base tarda, `/health` responde 503 hasta quedar `database: "ready"`.
- Migración nueva: aditiva, idempotente y re-ejecutable en `backend/migrations/AAAAMMDD_slug.sql`,
  registrada en `scripts/migration-order.mjs` y en las listas de fixtures de
  `test-suite.mjs` / `test-auth.mjs`. Nunca editar una migración ya aplicada.
- Seeds e importaciones con guards por conteo y `on conflict do nothing`; nunca «si el dato
  no existe, salir». No correr seeds contra producción.

## Variables de entorno (nombres; los valores viven en Coolify)

- Base y red: `DATABASE_URL`, `DATABASE_SSL`, `PORT`.
- Orígenes y sesiones: `APP_URL`, `PUBLIC_ORIGIN`, `CLIENT_PORTAL_ORIGIN`, `INVITE_LINK_SECRET`.
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- Correo: `WEEM_EMAIL_RELAY_URL`, `WEEM_EMAIL_RELAY_TOKEN`, `EMAIL_FROM`, `RESEND_API_KEY`.
- Suscripción: `STRIPE_BILLING_ENABLED`, `STRIPE_WEBHOOK_VERIFIED_AT`,
  `SUBSCRIPTION_CHECKOUT_PROVIDER` y las claves `PAGAYA_*`; el estado real se valida en
  `STRIPE-SETUP.md`.
- Plataforma e ingesta: `SCALE_INITIAL_PLATFORM_ADMIN_EMAIL`, `HUB_INGEST_KEY`.
- PDFs: `PUPPETEER_EXECUTABLE_PATH` (la imagen la define).
- Las variables se inyectan en runtime y nunca como ARG/ENV de build (lo verifica
  `tests/docker-build-secrets.test.mjs`). `DADOO_*`, `SCALE_IMPORT_COOKIE`, `*_DEBUG`,
  `SCALE_TRELLO_HISTORY` y `SCALE_CORE_API_DISABLE_LISTEN` (tests) no se usan en producción.

## Salud, smoke y release

- Único camino de release: `npm run release:patch` en la raíz (bump + suites + build +
  commit + push + smoke). El push a `main` dispara el webhook y Coolify despliega ambos
  servicios de este repositorio.
- `npm run release:smoke` valida `app.scaleparaguay.com/status`, `/registro` y
  `api.scaleparaguay.com/health` contra `SCALE_EXPECTED_VERSION`.
- Verificación de la última publicación (23-09-2026): `/health` responde
  `release.version 1.0.107` con base `ready` y la web 200 en `/status`.
- Los logs del contenedor son JSON por request (`request_error`, `email_delivery_readiness`);
  no imprimen valores de variables ni credenciales.

## Suites

| Suite | Comando | Requisitos |
| --- | --- | --- |
| Entrega (PGlite) | `npm --prefix backend run test:release` | sin instalación |
| Plataforma | `npm --prefix backend run test:platform` | PGlite |
| Migraciones (runner) | `npm --prefix backend run test:migrations-runner` | PGlite |
| PostgreSQL real | `npm --prefix backend run test:postgres` | binarios `initdb`/`pg_ctl` (ver `POSTGRES-CONCURRENCY.md`) |
| Benchmark de listas | `npm --prefix backend run bench:agency` | binarios `initdb`/`pg_ctl`; levanta un clúster temporal |

La suite de PostgreSQL real no entra en `test:release` ni en CI: se corre al tocar
inventario, tesorería o concurrencia de saldos. El benchmark de listas tampoco:
mide `work-orders`, `projects` e `inventario` con una semilla fija y sirve para
comparar antes/después de un cambio de consultas o índices.

## Incidentes

1. Revisar `/health` (503 = base inicializando o caída) y los logs del servicio en Coolify.
2. Si falla salud, autenticación o guardado tras un deploy, revertir **código** a la
   versión anterior; nunca borrar tablas, datos ni migraciones aplicadas.
3. Una migración defectuosa se corrige con una migración nueva (la anterior no se edita).
4. El mantenimiento y la limpieza de demos se activan desde el Hub, con pedido explícito;
   el respaldo externo/R2 sigue pendiente y no se activa por inferencia.

## Pendientes operativos

El detalle vigente y su límite están en `RELEASE-CHECKLIST.md` (tabla «Lo que todavía
impide cerrar todo»): Stripe real en modo test, correo en spam, respaldo externo/R2 y
purga, Trello/logos y la QA visual/móvil. No se acreditan como hechos por estar listados.
