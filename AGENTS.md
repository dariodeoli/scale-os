# Reglas operativas — Scale OS

## Despliegues (regla obligatoria)
- Cada deploy a producción incrementa el parche de versión. Usar siempre `npm run release:patch`: exige árboles limpios, sube la versión, sincroniza footer y versiones (frontend + API), corre regresiones y build, pushea en orden API → interfaz y dispara Coolify; el smoke valida las URLs públicas al final.
- No publicar sin bump de versión ni sin el footer regenerado (`footer:sync` / `footer:check`). Detalle en `VERSIONING.md`.
- La versión visible vive en `release/version.json`, sincronizada con `app/app-version.ts`, `package.json` y el footer.

## Entrega a main (regla obligatoria)
- Al terminar cada tarea autorizada, commitear por unidad de trabajo y mergear/pushear a main (API → interfaz) SIEMPRE, sin esperar un pedido explícito y sin bump de versión: el deploy a producción sigue siendo exclusivo de `npm run release:patch`. No dejar trabajo terminado sin mergear.
- Sincronizar los checkouts locales de main (ff-only) después del push.

## Verificación mínima antes de entregar
- `npm run test:release-regression` y `npx next build` (el release los corre igual).

## Diseño
- No duplicar identidad ni datos en el shell: empresa en el TopBar, usuario autenticado al pie del Sidebar, versión solo en el footer.
- Montos, fechas y códigos nunca se cortan (nowrap + tabular-nums). Usar las clases compartidas (`kpi-strip`/`kpi-card`, `panel`, `ops-card`, `Dialog`/`Editor`, `SaveActions`) y tokens de `ui-system.css`; nada de estilos inline salvo valores dinámicos.
- Los datos que muestra la UI deben venir del contrato real del API; nunca inventar estados, totales ni métricas.
