# Panel admin — rediseño #155 fase 2 (v1.0.172)

Implementación de la propuesta aprobada por el dueño (auditoría en
`docs/qa/admin-audit-155/AUDITORIA-155.md`). Sin cambios de API, permisos,
datos ni auditoría: mismas capacidades y endpoints.

## Qué cambió

### A · Resumen útil a 1440 (`app/superadmin/overview.tsx`)
- Grilla `minmax(0,1fr) + 22rem`: columna principal con KPIs y **tres paneles**
  (`Agencias por vencer`, `Últimas acciones` y **Suscripciones por estado**) y
  riel derecho con **«Requiere tu atención»** y **Atajos**.
- Señales de atención derivadas de lo ya cargado: bootstrap pendiente, agencias
  suspendidas, vencimientos a 7 días y suscripciones fuera de `active`
  (`platformAttention`, exportada para test).

### B · Encabezado y tabs
- Mobile: el encabezado pasa a **3 filas** (identidad en la fila de la marca,
  meta y acciones completas); H1 en una línea con elipsis.
- Tab activo con **barra inferior de marca** (`box-shadow inset` sobre
  `aria-pressed="true"`) además del fondo tenue.
- **Orden aprobado**: Resumen · Agencias · **Accesos** · Cupones · Auditoría.
- 390: wrapper `platform-admin-tabs-wrap` con sombra de continuidad del scroll.

### C · Estados (`app/superadmin/states.tsx`, `page.tsx`)
- **Skeleton propio del panel** (encabezado + tabs + KPIs + paneles) en lugar de
  la `LoadingScreen` genérica.
- Avisos con borde tokenizado (`border-warn-text/45`, `border-bad-text/40`) para
  alto contraste y **acción «Reintentar»** en el error (`onRetry`).
- Vacío de Agencias filtradas con CTA «Limpiar filtros» (`EmptyBlock`).

### D · Flujo (`app/superadmin/agencies.tsx`, `platform-admin.css`)
- «Gestionar suscripción» primaria visible; **Eliminar agencia** pasa al menú
  **⋯** del sistema (`ActionMenu`), conservando la confirmación reforzada
  (texto + reautenticación).
- Tarjetas móviles de Agencias a **200 px** con pie anclado (como Cupones/Accesos).
- Mobile: el contador «N de M» de la toolbar pasa a su propia línea.

## Evidencia

`docs/qa/admin-redesign-2/` — 48 capturas (8 superficies × 390/1440 ×
claro/oscuro/alto contraste): resumen, agencias, menú ⋯, cupones, accesos,
auditoría, skeleton y avisos. Fixtures: `admin-redesign-2` en
`build-tools/visual-harness/fixtures/admin-redesign.mjs` (espejan el JSX real).
Medición del harness: `work/visual-harness/admin-redesign-2/baseline.md`.

## Tests

`tests/superadmin.test.tsx` — 12 casos, incluido el nuevo contrato #155
(resumen con atención/atajos/suscripciones, orden de tabs, skeleton, avisos con
recuperación, ⋯ y tarjetas de 200 px) y la conservación de capacidades
(endpoints, reautenticación, viewer sin controles mutantes).

## Checks

`npm run test:release-regression` ✅ · `npx next build` ✅ · sin marcadores.
