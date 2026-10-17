# Candidato 1.0.191 — validación de integración

17/10/2026. Código funcional final: `2a89a8b6`; contratos de pruebas alineados
en `47170559`; evidencia final de permisos en `f4958be6`. Este registro describe
validación local, no anticipa CI, merge ni producción.

## Gates ejecutados

- `npm run test:release-regression`: PASS, 239 entradas en 39 fragmentos, exit 0.
- `npm run build`: PASS, exit 0 y `.next/BUILD_ID` no vacío.
- `npx tsc --noEmit`: PASS. `release:check`, `footer:check` y `git diff --check`: PASS.
- `npm --prefix backend run test:release`: PASS completo, exit 0 sobre backend
  final `2e792cca`; los cambios posteriores son de frontend, pruebas y documentación.
- PostgreSQL 17 real: arranque limpio y actualización hasta migración 114,
  reejecución, rollback atómico del tracker, historial inmutable, revisiones
  numéricas y concurrencia salarial. Facturas, cobros y centavos conservados.

Las dos guardas estáticas de Equipo esperaban permisos por rol; se actualizaron
para exigir permisos efectivos. Las pruebas de componentes ejercitan denegación,
habilitación excepcional, dueño y revocación conservando el borrador.

## Evidencia funcional

- [Balance y cuentas](balance-historial-238/README.md): 143 comprobaciones.
- [Sincronización salarial](balance-historial-238/salary-sync.md): 24 comprobaciones.
- [Pestañas y permiso efectivo](balance-historial-238/person-tabs-results.json):
  11 comprobaciones de ocultación/foco/borradores; el
  [suplemento de permisos](balance-historial-238/person-permission-results.json)
  acredita 9 más. No se repitieron las matrices económicas anteriores.
- [Cliente y representante](clientes-responsable-239/README.md): 86 registros,
  50 nombres únicos de comprobación; claro/oscuro y escritorio/móvil.
- [Acceso existente](acceso-existente-237.md): 9 casos y 19 mediciones. Transporte
  simulado en navegador; las suites API prueban identidad existente y concurrencia.

Los informes conservan su SHA, fixture y alcance propio. No se acreditan OAuth
ni correo reales, proveedor RUC real ni escrituras de prueba en producción.

## Publicación y seguimiento

El integrador registrará PR, SHA de main, CI y smoke web/API en GitHub al
publicar. Los issues #237–240 permanecen abiertos hasta esa verificación.
#241 continúa como campaña separada de biblioteca y catálogo.
