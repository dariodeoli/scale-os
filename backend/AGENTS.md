# Backend — API de Scale OS

Este directorio es el API dentro del monorepo `scale-os` (migración scale-os#34, campaña SOS-MIG).
Las reglas operativas vigentes son las de la raíz: **`../AGENTS.md`** (sección «Backend»).

No dupliques reglas acá. Hooks, CI, worktrees, versiones y deploy viven en la raíz del repositorio:

- Hooks: `../.githooks/pre-push` (instalar una vez por checkout con `bash ../scripts/setup-hooks.sh`).
- CI: `../.github/workflows/ci.yml`, job `backend` con `working-directory: backend`.
- Versión: `../release/version.json`; sincronizá con `../build-tools/sync-release-version.mjs`.
- Suites: `npm ci && npm run test:release` desde este directorio.
