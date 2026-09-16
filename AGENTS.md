# Reglas operativas — Scale OS

## Comando abreviado `ht` (integrar y desplegar)
- Cuando Dario escribe solo `ht`, ejecutar el ciclo completo sin preguntar: (1) `git fetch origin --prune` en scale-os y scale-core-api y relevar ramas con trabajo pendiente; (2) integrar a main una rama por vez (API antes que frontend), verificando el árbol mergeado (API `npm run test:release`; frontend `npm run test:release-regression` + `npx next build`); (3) conflictos: si la rama quedó superseded por main, resolver del lado de main y verificar diff neto vacío; si hay trabajo real en conflicto, parar y preguntar; (4) pushear ambos repos; (5) desplegar con `npm run release:patch` y validar el smoke (reintentar hasta que Coolify sirva la versión nueva). Reportar al final qué ramas integraron y la versión desplegada.

## Despliegues (regla obligatoria)
- Cada deploy a producción incrementa el parche de versión. Usar siempre `npm run release:patch`: exige árboles limpios, sube la versión, sincroniza footer y versiones (frontend + API), corre regresiones y build, pushea en orden API → interfaz y dispara Coolify; el smoke valida las URLs públicas al final.
- No publicar sin bump de versión ni sin el footer regenerado (`footer:sync` / `footer:check`). Detalle en `VERSIONING.md`.
- La versión visible vive en `release/version.json`, sincronizada con `app/app-version.ts`, `package.json` y el footer.
- Las sesiones de worktree (SOS-01/02/03) nunca despliegan. El deploy es exclusivo del integrador, y solo con pedido explícito.

## Integración a main (regla obligatoria)
- main pertenece al integrador. Ningún agente de worktree hace `git merge`, edita main ni pushea a main: los cambios se integran únicamente a través del integrador.
- Antes de tocar archivos: `git fetch origin --prune && git rebase origin/main`. Conflicto → se resuelve en la rama propia; force-push solo a la rama propia, jamás a main.
- Entrega (handover): commitear por unidad de trabajo (conventional commits, sin atribución de IA), correr la verificación mínima, pushear la rama propia y avisar con: nombre de rama, `git log --oneline origin/main..HEAD`, qué hace cada commit, rutas tocadas y resultado de las verificaciones.
- Después de una integración anunciada, verificar por contenido contra `origin/main` (`git merge-base --is-ancestor <sha> origin/main` + `git show origin/main:<ruta>`), no por memoria. Si algo falta, reaplicarlo sobre main actualizado.
- Estado raro de git (fetch que falla, refs rotas): parar y avisar al integrador. No borrar ni arreglar refs por cuenta propia.
- Verificación mínima antes de entregar: `npm run test:release-regression` y `npx next build` (el release los corre igual).

## Diseño
- No duplicar identidad ni datos en el shell: empresa en el TopBar, usuario autenticado al pie del Sidebar, versión solo en el footer.
- Montos, fechas y códigos nunca se cortan (nowrap + tabular-nums). Usar las clases compartidas (`kpi-strip`/`kpi-card`, `panel`, `ops-card`, `Dialog`/`Editor`, `SaveActions`) y tokens de `ui-system.css`; nada de estilos inline salvo valores dinámicos.
- Los datos que muestra la UI deben venir del contrato real del API; nunca inventar estados, totales ni métricas.
