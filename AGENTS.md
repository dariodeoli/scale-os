# Reglas operativas — Scale OS

## Despliegues (regla obligatoria)
- Cada deploy a producción incrementa el parche de versión. Usar siempre `npm run release:patch`: exige árboles limpios, sube la versión, sincroniza footer y versiones (frontend + API), corre regresiones y build, pushea en orden API → interfaz y dispara Coolify; el smoke valida las URLs públicas al final.
- No publicar sin bump de versión ni sin el footer regenerado (`footer:sync` / `footer:check`). Detalle en `VERSIONING.md`.
- La versión visible vive en `release/version.json`, sincronizada con `app/app-version.ts`, `package.json` y el footer.
- Las sesiones de worktree (SOS-01/02/03/…) nunca despliegan ni mergean/pushean main: trabajan solo en su rama y la integración a main la hace el integrador. El deploy queda a cargo del checkout principal con `npm run release:patch`.

## Entrega por rama e integración (regla obligatoria)
- Cada sesión de worktree trabaja SOLO en su worktree y su rama asignada (ej. SOS-02). Prohibido `git merge`, `git checkout main` para editar y `git push origin main`; tampoco arreglar ni borrar refs remotas por cuenta propia: ante un estado raro de git, parar y avisar.
- Commit por unidad de trabajo (conventional commits, sin atribución de IA). Antes de pushear, correr las verificaciones del proyecto y reportar el resultado.
- Entregar pusheando `origin/<rama>` y avisar con: nombre de rama, `git log --oneline origin/main..HEAD`, qué hace cada commit y el resultado de las verificaciones.
- Al empezar la jornada y después de cada integración: `git fetch origin && git rebase origin/main`. Los conflictos se resuelven en la rama propia; force-push solo a la rama propia, jamás a main.

## Verificación mínima antes de entregar
- `npm run test:release-regression` y `npx next build` (el release los corre igual).

## Diseño
- No duplicar identidad ni datos en el shell: empresa en el TopBar, usuario autenticado al pie del Sidebar, versión solo en el footer.
- Montos, fechas y códigos nunca se cortan (nowrap + tabular-nums). Usar las clases compartidas (`kpi-strip`/`kpi-card`, `panel`, `ops-card`, `Dialog`/`Editor`, `SaveActions`) y tokens de `ui-system.css`; nada de estilos inline salvo valores dinámicos.
- Los datos que muestra la UI deben venir del contrato real del API; nunca inventar estados, totales ni métricas.
