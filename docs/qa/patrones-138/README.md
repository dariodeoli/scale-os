# Patrones de demo — tarjetas + ⋯, esqueletos y empty states (#138)

Evidencia de la ronda SOS-DSN de la auditoría del dueño (02-10): patrones
comunes que después adoptan COM/OPS/FIN/PLT. El contrato vive en
`DESIGN-SYSTEM.md` §Tarjetas compactas + menú ⋯ / §Esqueletos con estructura
real y precarga / §Estados vacíos compactos / §KPIs compactos y tablas en móvil.

## Qué cambió

| Patrón | Fuente única | Adopción en esta rama |
| --- | --- | --- |
| Tarjeta compacta (título, contexto, vencimiento, responsable, avance) | `CompactCard` + `CompactQuickAction` (`app/ui-v2.tsx`) | Pendientes internos de Resumen (`app/work-history.tsx`) |
| Menú ⋯ (una acción rápida visible; editar/imprimir/archivar/eliminar al menú, con confirmación y teclado) | `ActionMenu` + `RecordMenuItem` + `menuFocusIndex`/`runMenuItem` (`app/ui-v2.tsx`, motor `MenuDesplegable`) | `RecordEditor` de `app/suite.tsx`; tarjetas de pendientes internos |
| Esqueletos con estructura real (tarjetas, tablas, KPIs) | `CardSkeleton`/`CardGridSkeleton`/`TableSkeleton`/`DashboardSkeleton` + `SectionLoading variant` (`app/ui-v2.tsx`) | Arranque de Resumen y chunks diferidos; montos del panel comercial/financiero (`app/control-center.tsx`) |
| Vacío compacto de una línea, accionable y descartable | `EmptyCompact` (`app/ui-v2.tsx`) | Planificador (`app/productivity-ui.tsx`) y pendientes internos (`app/work-history.tsx`) |
| KPIs compactos en mobile | `KpiStrip compact` + reglas en `app/ui-system.css` | Preferencias (`app/sections/preferencias.tsx`) |
| Precarga de métricas (Resumen/Finanzas/Informes) | `app/metrics-prefetch.ts` (#139, ya integrado) | Verificado: se dispara con la identidad y el widget repinta con dato o esqueleto |

## Evidencia visual

Harness con el CSS construido (fixtures `build-tools/visual-harness/fixtures/patrones-138.mjs`;
el ⋯ abierto se muestra en flujo para no medir falsos solapes de overlay):

```bash
node build-tools/visual-harness/run.mjs --only patrones-138 --widths 390,1440 \
  --out work/visual-harness/patrones-138          # 8 fixtures, 0 hallazgos
node build-tools/visual-harness/capture.mjs \
  --input work/visual-harness/patrones-138/audit.html --out docs/qa/patrones-138 \
  --widths 390,1440 --themes light,dark --viewport 1440x900,390x844 \
  --only patrones-138-tarjeta-antes,patrones-138-tarjeta-despues,patrones-138-menu-antes,patrones-138-menu-despues,patrones-138-skeleton-antes,patrones-138-skeleton-despues,patrones-138-empty-antes,patrones-138-empty-despues
```

Medición: `work/visual-harness/patrones-138/baseline.md` (0 hallazgos, 0
`docOverflow` a 390 y 1440). Capturas (32, claro/oscuro, 390/1440) en este
directorio: `<fixture>-<ancho>-<tema>.png` para tarjeta, ⋯, esqueleto y vacío,
en sus dos fases (`antes`/`despues`).

- **Tarjeta**: la fase `antes` apila la descripción completa y la acción suelta;
  la `despues` muestra los cinco datos y la descripción en el detalle.
- **⋯**: la fase `antes` es la fila de seis iconos sueltos; la `despues` deja
  una acción rápida visible y editar/imprimir/papelera en el menú.
- **Esqueleto**: `LoadingBlock` genérico contra `DashboardSkeleton`
  (KPIs + tarjetas con la forma real).
- **Vacío**: bloque centrado contra la línea baja con acción y descarte.

## Verificación

```sh
npm run test:release-regression   # incluye tests/ui-patterns-138.test.tsx
npx next build
npm run release:check && npm run footer:check
rg "<<<<<<<" app tests build-tools   # sin resultados
```

`tests/ui-patterns-138.test.tsx` cubre: contrato de teclado del menú
(`menuFocusIndex`), confirmación (`runMenuItem`), disparador rotulado e ítems
reales, cinco datos de la tarjeta, estructura de los esqueletos sin cifras,
vacío compacto con acción/descarte, KPIs compactos y la adopción en
`suite.tsx`/`resumen.tsx`/`control-center.tsx`/`work-history.tsx`/`preferencias.tsx`.

## Fuera de alcance / siguientes pasos

- Los fixes de dominio de las tarjetas de Pipeline/Equipo/Presupuestos y las
  tablas que no migraron a tarjeta en mobile los adopta cada slot con este
  contrato (COM/OPS/FIN/PLT), de a una pantalla por cambio.
- La confirmación de acciones peligrosas vía `ActionMenu.confirm` queda lista
  para los dominios; en el kit, archivar/eliminar sigue usando
  `RemoveRecordDialog` (reautenticación propia).
