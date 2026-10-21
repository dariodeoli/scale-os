# Despliegue — monorepo Scale OS

Un repositorio (`dariodeoli/scale-os`), dos servicios en Coolify. El API vive en `backend/`
desde la migración scale-os#34; su historial llegó con `git subtree`, el servicio de Coolify
ya construye desde este repositorio y el repo original (`dariodeoli/scale-core-api`) quedó
**archivado**. No hay dos pushes por release ni dos backlogs.

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
  con la versión central. Manual operativo del servicio: `backend/OPERATIONS.md`.
- **Estado de la migración**: completada (Refs #34). La Fase 2 cambió el servicio API a
  repositorio `dariodeoli/scale-os` con base directory `backend/`, mismo dominio, mismas
  variables y Dockerfile `backend/Dockerfile`; la Fase 3 archivó el repo viejo. Si Coolify
  se reconfigura, esos son los valores que deben conservarse.

## Disparo del deploy

- Push a `main` → webhook GitHub → Coolify despliega **ambos** servicios del repositorio.
- `npm run release:patch` es el único camino de release: árbol limpio, un solo bump de
  `release/version.json`, sincronización de front y `backend/`, regresiones + build +
  `npm --prefix backend run test:release`, un solo commit y un solo push a `main`.
- Con `main` protegido, usar `npm run release:patch -- --prepare` sobre la rama de
  entrega limpia: hace el mismo bump, sincronización, checks y commit, y termina
  antes de cualquier push, webhook o smoke. Publicar la rama en un PR, esperar los
  checks obligatorios e integrar. El merge a `main` dispara Coolify; después correr
  `npm run release:smoke`. Este modo evita publicar un commit de versión que aún
  no tiene CI aprobado y mantiene un único bump por entrega.
- Desarrollo, CI y ambas imágenes usan Node 24, requerido por `owncoding-ui`.
- Webhooks directos opcionales (`.release.env`, gitignored):
  `SCALE_API_DEPLOY_WEBHOOK` y `SCALE_WEB_DEPLOY_WEBHOOK` (ambos o ninguno);
  `SCALE_DEPLOY_WEBHOOK_METHOD` (default `GET`). Si quedan vacíos se usa el webhook
  GitHub → Coolify ya configurado.
- `npm run release:smoke` valida `/status`, `/registro` y `/health` contra la versión
  esperada (`SCALE_EXPECTED_VERSION`), con base `ready`. Además exige que el proxy
  web responda 401 JSON para `/core-api/api/auth/me` sin sesión y 200 JSON válido
  para `/core-api/api/auth/providers` y `/core-api/api/public/maintenance`.
  Así una web disponible con el acceso caído no aprueba el smoke (Refs #253).
  No prueba OAuth ni una sesión autenticada. Los orígenes HTTPS siguen siendo
  configurables con `SCALE_APP_ORIGIN` y `SCALE_API_ORIGIN`; el límite global es
  `SCALE_SMOKE_TIMEOUT_MS` (240000 ms por defecto). Reintentar sólo estas sondas
  de lectura no vuelve a desplegar.

## Verificación de una publicación

```sh
npm run release:patch     # bump + suites + build + commit + push + smoke
npm run release:smoke     # reintentable hasta que Coolify sirva la versión nueva
```

Comprobar además que `/health` del API devuelve `release.version` nueva y que la web
muestra el footer con esa versión. La protección de `main` en GitHub exige CI strict
(front + backend) y no admite force-push.

Si la rama tocó inventario, tesorería o concurrencia de saldos, sumar
`npm --prefix backend run test:postgres` (binarios `initdb`/`pg_ctl`; ver
`backend/POSTGRES-CONCURRENCY.md`): esa suite no entra en `release:patch` ni en CI.

## Verificación de la migración (23-09-2026)

- `api.scaleparaguay.com/health` → HTTP 200 con `release.version` `1.0.107` y
  `database: "ready"`; la web responde 200 en `/status`.
- `dariodeoli/scale-core-api` figura archivado en GitHub.
- El rollout de la migración quedó registrado en las releases v1.0.106/v1.0.107; no hay
  pasos pendientes de Fase 2 ni de Fase 3.


## OwnData RUC: configuración y aceptación (Refs #353)

La consulta sale exclusivamente del **servicio API** (`backend/`), con una clave
secreta Live, personal o empresarial, activa y con `ruc:read`. Configurar en
**Production → Environment Variables → Runtime**, sin Buildtime:

```dotenv
OWNDATA_API_ORIGIN=https://app.controlaria.online
OWNDATA_API_KEY=<clave secreta Live, cargada en el panel; nunca en Git>
```

La configuración histórica `RUC_LOOKUP_PROVIDER_KIND=owndata` y
`RUC_LOOKUP_PROVIDER_URL=https://app.controlaria.online/api/v1/ruc` se conserva
por compatibilidad. Si existe un `RUC_LOOKUP_PROVIDER_KIND=legacy`, corregirlo a
`owndata`: no se admite mezclar ambos proveedores. No colocar la clave en el servicio web, `NEXT_PUBLIC_*`,
argumentos Docker, URLs ni documentación. Los tokens administrativos de Coolify
pertenecen al entorno del integrador, no a la aplicación Scale.

Un arranque que falla en `rucLookupConfig` no es un fallo del parser de respuestas:
revisar nombre exacto `OWNDATA_API_KEY`, alcance Production y disponibilidad
Runtime; comprobar en el panel que sea secreta, sin saltos internos y no `pk_`.
No desactivar el healthcheck ni publicar un proveedor sin límites para sortearlo.
Esperar el resultado del despliegue existente antes de solicitar otro.

La aceptación requiere además del smoke de versión una sesión de Scale con
`clients.manage`, sin cookies de OwnData:

1. Abrir el editor de cliente y conservar un nombre editado manualmente.
2. Consultar un RUC/DV válido con “Extraer datos del RUC”. Comprobar carga y
   resultado sin sobrescribir el nombre hasta confirmar.
3. Para una persona confirmada, activar esa opción explícitamente y comprobar
   la presentación devuelta por OwnData; para una empresa conservar la razón
   social oficial. No inferir el tipo por RUC, coma o mayúsculas.
4. Aplicar o descartar la sugerencia. Guardar no debe repetir la consulta.
5. Revisar en Network sólo peticiones al proxy de Scale: ningún X-API-Key,
   cookie de OwnData, estado fiscal ni diagnóstico del proveedor al navegador.
6. Acreditar errores con fixtures locales (clave inválida/revocada/vencida,
   plan/API deshabilitados, 404, 429 y 503), sin desactivar una clave real ni
   agotar su cupo para QA. Con fallo externo el ingreso manual sigue disponible.

Registrar la versión de web y API por separado, SHA servido sólo si se expone,
y evidencia real del formulario. Un `/health` correcto no acredita este flujo ni
la activación de la clave. Mantener el issue abierto si falta acceso autenticado.
