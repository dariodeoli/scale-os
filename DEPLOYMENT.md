# Despliegue — monorepo Scale OS

Un repositorio (`dariodeoli/scale-os`), dos servicios en Coolify. El API vive en `backend/`
desde la migración scale-os#34; su historial llegó con `git subtree` y su repo original
(`dariodeoli/scale-core-api`) se archiva. No hay dos pushes por release ni dos backlogs.

## Servicios

| Servicio | Base en Coolify | Dockerfile | Dominio | Puerto | Salud |
| --- | --- | --- | --- | --- | --- |
| Web (Next.js) | `/` (raíz) | `/Dockerfile` | `app.scaleparaguay.com` | 3000 | `/status`, `/registro` |
| API (Express + Postgres) | `backend/` | `backend/Dockerfile` | `api.scaleparaguay.com` | 3000 | `/health` |

- **Web**: build standalone de Next (`next.config.mjs` con `output:'standalone'`); el
  `prebuild` sincroniza versión y footer. Variables de runtime inyectadas por Coolify
  (nunca como ARG/ENV de build). `SCALE_API_ORIGIN` define el origen del API (default
  `https://api.scaleparaguay.com`) y se valida con `core-api-origin.mjs`.
- **API**: `node server.js` sobre el Postgres de Coolify. El proceso aplica al arrancar las
  migraciones pendientes (`migrations-runner.mjs`, advisory lock + baseline) además de
  `schema.sql` y la lista curada de `server.js`; no hay paso manual de migración en el
  deploy. `/health` responde `{ok, database, release:{version}}` (503 mientras la base
  inicializa). El `release.version` sale de `backend/release-version.json`, sincronizado
  con la versión central.
- **Fase 2 (cambio de base del servicio API — lo hace Dario)**: el servicio API de Coolify
  hoy construye desde el repo `dariodeoli/scale-core-api`; en la ventana coordinada se
  cambia a repositorio `dariodeoli/scale-os` con **base directory `backend/`**, el mismo
  dominio, las mismas variables de entorno y el Dockerfile `backend/Dockerfile`. Hasta ese
  cambio, el API sigue desplegándose desde el repo viejo: no tocar la configuración del
  servicio en Fase 1.

## Disparo del deploy

- Push a `main` → webhook GitHub → Coolify despliega **ambos** servicios del repositorio.
- `npm run release:patch` es el único camino de release: árbol limpio, un solo bump de
  `release/version.json`, sincronización de front y `backend/`, regresiones + build +
  `npm --prefix backend run test:release`, un solo commit y un solo push a `main`.
- Webhooks directos opcionales (`.release.env`, gitignored):
  `SCALE_API_DEPLOY_WEBHOOK` y `SCALE_WEB_DEPLOY_WEBHOOK` (ambos o ninguno);
  `SCALE_DEPLOY_WEBHOOK_METHOD` (default `GET`). Si quedan vacíos se usa el webhook
  GitHub → Coolify ya configurado.
- `npm run release:smoke` valida `app.scaleparaguay.com/status`, `/registro` y
  `api.scaleparaguay.com/health` contra la versión esperada (`SCALE_EXPECTED_VERSION`).

## Verificación de una publicación

```sh
npm run release:patch     # bump + suites + build + commit + push + smoke
npm run release:smoke     # reintentable hasta que Coolify sirva la versión nueva
```

Comprobar además que `/health` del API devuelve `release.version` nueva y que la web
muestra el footer con esa versión. La protección de `main` en GitHub exige CI strict
(front + backend) y no admite force-push.

## Checklist de Fase 2 (ventana coordinada)

1. Dario cambia el servicio API de Coolify a `dariodeoli/scale-os` con base `backend/`.
2. El integrador mergea `SOS-MIG` y corre `npm run release:patch` (v1.0.103) + smoke.
3. Confirmar que ambos servicios sirven la versión nueva antes de archivar
   `dariodeoli/scale-core-api` (Fase 3).
