# Modelo de trabajo de Scale OS

Adaptación del modelo indicado por el dueño el 17/10/2026. Repositorio único:
`dariodeoli/scale-os`; frontend en la raíz y API en `backend/`.

## Issue y responsabilidad

Cada pedido se registra en GitHub antes de implementar: objetivo, alcance,
criterios de aceptación, riesgos/dependencias, pruebas y estado del deploy.
Commits y PR citan `Refs #N`. El agente principal coordina y un único responsable
de integración ejecuta el merge y la publicación autorizada.

Cada subagente recibe una tarea y rutas concretas, trabaja en su propia rama
`codex/<area>-<descripcion>` y checkout/worktree aislado, se actualiza desde
`origin/main`, corre pruebas focales y entrega rama, commit, archivos, resultados
y PR. No edita `main`, no despliega ni pisa el trabajo de otro agente. No se
crean tareas duplicadas. Los nombres SOS-COM/OPS/FIN/PLT/DSN siguen identificando
dominios; las ramas de nuevas entregas siguen la convención `codex/` del dueño.

## Comandos reales

| Comprobación | Comando de Scale |
| --- | --- |
| Tipos | `npx tsc --noEmit` |
| Cliente Prisma | `npm run db:generate` |
| Schema Prisma, si cambia | `npx prisma validate` con DATABASE_URL local de prueba |
| Regresión frontend | `npm run test:release-regression` |
| Build | `npm run build`, comprobar `.next/BUILD_ID` |
| Backend | `npm --prefix backend run test:release` |
| Sintaxis backend afectada | `node --check <archivo.js>` |
| Migraciones | `npm --prefix backend run test:migrations-runner` y suites funcionales afectadas |
| Concurrencia tareas | `npm --prefix backend run test:tasks-postgres` |
| Concurrencia inventario/tesorería | `npm --prefix backend run test:postgres` |
| Flujo tareas/contratos | `node build-tools/qa-tasks-contracts.mjs`, con fixtures exclusivamente locales |
| Versiones/footer | `npm run release:check` y `npm run footer:check` |

No existen scripts genéricos `lint`, `test`, `test:e2e:smoke`, `db:check` ni
`backend build/prisma:validate/test:unit`: no se ejecutan ni se acreditan como
checks de este repositorio. Se mantienen los equivalentes anteriores y los
tests específicos del cambio. Node 24 es requerido por `owncoding-ui`.

## Integración y deploy

1. Verificar que no haya merge o release en curso. Conservar cambios ajenos.
2. Actualizar/rebasear cada rama contra `origin/main`; informar y resolver los
   conflictos explícitamente en esa rama y repetir las pruebas afectadas.
3. Preparar una entrega limpia: novedades, `npm run release:patch -- --prepare`.
   El script hace un único bump, sincroniza, valida y crea el commit de versión;
   este modo no pushea, llama webhooks ni ejecuta smoke.
4. Publicar PR con problema, solución, criterios, pruebas, limitaciones e issues.
   Esperar CI verde del SHA candidato antes de integrar. Sólo el integrador
   mergea a `main`, sin omitir sus protecciones ni checks obligatorios.
5. Confirmar SHA de merge y CI de `main`. El merge dispara el webhook de Coolify
   para web y API; no volver a llamar un deploy para ese SHA mientras siga
   queued/in_progress, ni repetirlo automáticamente si ya existe y falló.
6. Seguir el deployment y comprobar versión, SHA servido si el proveedor lo
   expone, base/migraciones y `npm run release:smoke`. Registrar por separado
   SHA/artefacto local, SHA del proveedor y respuesta servida; un dato faltante
   se informa como no disponible, nunca se sustituye por una suposición.

La variable del integrador en Scale es `SCALE_INTEGRATOR`, no `MOBOS_INTEGRATOR`.
No hay `release:build-current`, `release:publish`, impresión nativa ni App Store
en este repositorio. La impresión física, OAuth, proveedores externos y móviles
físicos se acreditan sólo cuando realmente se hayan probado.

## Cierre y reporte

El issue sólo se cierra tras integración, pruebas y deploy verificado cuando
corresponda, aceptación acreditada y limitaciones documentadas. Una prueba
física o revisión externa pendiente mantiene abierto el seguimiento afectado.

Formato de reporte: **🟢 Hecho · 🔵 Validado · 🟡 En curso · 🔴 Bloqueado/Pendiente ·
📁 Archivos · 🧪 Pruebas · 🚀 Deploy**. Distinguir siempre cambios, CI y producción.
Incluir novedades para el dueño y reversión que conserve datos/documentos.

## Fuentes consultadas

- Modelo del dueño pegado en esta conversación.
- `owncoding-ui/docs/MODOS-DE-TRABAJO.md`, `PLANTILLA-AGENTS.md` y `COMANDOS.md`.
- `owncoding-ui/.claude/handoff.md`, reglas compartidas y catálogo de roles
  architect/domain/forms/infra/mapper/qa/shell versionados en GitHub.

La sesión cloud no accede al disco de la Mac. Leer estos archivos de GitHub no
equivale a inspeccionar los skills/agentes locales que no están versionados.
