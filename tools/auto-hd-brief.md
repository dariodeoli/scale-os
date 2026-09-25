hd automático (política del grupo: ≥15 commits sin integrar, integrador libre, cooldown 20 min).

Ciclo completo, sin pedir confirmación, sobre el repo scale-os (no toques MobOS, LedBox ni la librería):

1. `git fetch origin --prune` y relevá las ramas con commits sobre `origin/main` (`git log --oneline origin/main..origin/<rama>`).
2. Verificación por contenido: cada rama que vayas a integrar debe tener handover citando su issue. Si el handover dice que espera otra integración (#47 antes que las referencias de #42, por ejemplo), respetá ese orden. Si una rama quedó superseded (diff neto vacío tras rebase), descartala y reportalo.
3. Un `merge --no-ff` por rama, una por vez. Si hay conflicto real: se resuelve en el worktree del slot que rebasea (nunca en main, nunca en silencio); si el slot no está disponible, descartá esa rama de esta ronda y seguí con las demás.
4. Checks del árbol mergeado: `npm run test:release-regression`, `npx next build` (con `.next/BUILD_ID`), `npm --prefix backend run test:release`, cero marcadores.
5. Push único con `SCALE_INTEGRATOR=1` cuando todo esté verde.
6. `docs/NOVEDADES.md`: creá/actualizá la sección de la versión con las novedades en lenguaje de producto (por módulo, 2-5 bullets), acumulativo. Si el archivo no existe, crealo.
7. Release: `npm run release:patch` (un solo bump de versión) y después `npm run release:smoke` reintentando hasta que Coolify sirva la versión nueva (web y API).
8. Reporte final al orquestador: ramas integradas, commits por rama, commit de merge, versión desplegada, resultado del smoke e incidentes. Si algo falla, dejá `main` consistente, no reintentes a ciegas y reportá para que el orquestador decida.
