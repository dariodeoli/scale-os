# Candidato 1.0.191 — validación de integración

17/10/2026. Código funcional final: `2a89a8b6`; contratos de pruebas alineados
en `47170559`; evidencia final de permisos en `f4958be6`. Este registro conserva la validación local y añade la verificación pública posterior al merge.

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

Publicado mediante [PR #244](https://github.com/dariodeoli/scale-os/pull/244).
Main: `df800790c88f9e830c2b4fc246984f42730d5509` (v1.0.191).
[CI de main](https://github.com/dariodeoli/scale-os/actions/runs/39017188566): ambos gates aprobados, igual que en el candidato.

17/10/2026 09:00 UTC: `npm run release:smoke` PASS contra producción.
`/status` y `/registro` publican v1.0.191; API `/health` devuelve v1.0.191,
`ok=true` y `database=ready`. Landing `/scale-os.html` coincide byte por byte
con main: SHA-256 `b0893d4acaf9faedf655d19680213de0c926562252a2f84a2cbb9e4703bce01f`.

El dueño confirmó que Coolify esperaba otro deploy. Se esperó la publicación
sin lanzar un segundo deploy. No se dispone del SHA interno del proveedor;
el SHA de integración se acredita mediante GitHub y la versión pública mediante
los endpoints, sin afirmar observaciones internas de infraestructura.
Los issues #237–240 se actualizan con esta evidencia y se cierran tras el smoke.
#241 continúa como campaña separada de biblioteca y catálogo.
