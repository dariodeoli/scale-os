# Backend — API de Scale OS

Este directorio es el API dentro del monorepo `scale-os` (migración scale-os#34, campaña SOS-MIG).
Las reglas operativas vigentes son las de la raíz: **`../AGENTS.md`** (sección «Backend»).

No dupliques reglas acá. Hooks, CI, worktrees, versiones y deploy viven en la raíz del repositorio:

- Hooks: `../.githooks/pre-push` (instalar una vez por checkout con `bash ../scripts/setup-hooks.sh`).
- CI: `../.github/workflows/ci.yml`, job `backend` con `working-directory: backend`.
- Versión: `../release/version.json`; sincronizá con `../build-tools/sync-release-version.mjs`.
- Suites: `npm ci && npm run test:release` desde este directorio.

## Onboarding rápido

1. Instalá dependencias: `npm ci` desde `backend/` (el paquete se llama `scale-os-api`).
2. Suites de entrega (PGlite, sin instalación): `npm run test:release`. Contratos de
   plataforma y del runner de migraciones: `npm run test:platform` y `npm run test:migrations-runner`.
3. Concurrencia en **PostgreSQL real** (requiere `initdb`/`pg_ctl`; `brew install postgresql@16`
   o `@17`): `npm run test:postgres`. Correrlo al tocar inventario, tesorería o saldos;
   detalle de entorno y evidencia en `POSTGRES-CONCURRENCY.md`.
4. Operación y deploy: `OPERATIONS.md` (manual del API), `../DEPLOYMENT.md` (servicios,
   release por versión y smoke) y `../VERSIONING.md` (fuente única de la versión).
5. Historial de entregas y pendientes vigentes: `RELEASE-CHECKLIST.md`.
