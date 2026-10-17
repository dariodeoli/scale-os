# Handoff — tareas, contratos y backlog

## Estado

Entrega sobre `dariodeoli/scale-os`, base
`e55f4058452f9dee46c46090d54648194e9cd1f7` (v1.0.187).
Seguimiento publicado: [plan #202](https://github.com/dariodeoli/scale-os/issues/202),
issues funcionales #203–#217 y protocolo/infra #218. El usuario autorizó
implementar, integrar y desplegar. La evidencia local no acredita publicación.

Se leyeron la memoria `.engram`, el handoff de GitHub y las guías/agentes
versionados de owncoding-ui. El modelo vigente del dueño está adaptado en
`docs/WORKFLOW.md`; esta sesión cloud no tiene acceso al disco de su Mac.

## Cambios

- Tareas: se amplió la entidad interna existente, con responsables múltiples,
  prioridad, fecha/hora Asunción, vínculos a proyecto/cliente, checklist,
  materiales por enlaces y comentarios. Inicio y proyecto consumen el mismo ID.
- Capacidades de tareas, alcance propio/equipo, membresía vigente dentro de la
  transacción y conflictos 409. El historial también respeta el alcance y una
  revocación de lectura de tareas.
- Perfil legal complementario de empresa: ciudad, departamento y representante,
  con procedencia y revisión optimista; se reutilizan dirección/RUC existentes.
- Contratos: plantillas de texto con variables permitidas, autofill con fuentes,
  edición/previsualización, revisión humana, versiones inmutables y PDF privado.
  Los datos bancarios requieren permiso adicional en todas las superficies.
- IA opcional reutiliza la configuración existente y recibe sólo nombres de
  campos/presencia: nunca texto contractual, valores, cuentas ni secretos.
- Dos migraciones aditivas registradas en servidor, cadena curada y fixtures.
  Se corrigió una prueba de Estudio con fechas fijas para consultar explícitamente
  el período de sus fixtures; la aplicación conserva su ventana móvil.

Diseño y auditoría: `docs/tasks-contracts-design.md`.
API y pruebas: `backend/employee-tasks.js`, `backend/contracts.js`, sus suites y
`backend/test-employee-tasks-postgres.mjs`.
UI: `app/employee-tasks*`, `app/contracts-*`, `app/company-legal-profile*` y sus
montajes en inicio, proyectos, configuración y navegación.

## Validación

- Regresión frontend completa: **229 entradas aprobadas**.
- `npm --prefix backend run test:release`: **46 suites aprobadas**, incluyendo
  tareas, contratos y la prueba de Estudio corregida.
- Suites específicas de tareas/contratos, productividad, historial y Estudio:
  aprobadas. PostgreSQL 17 real: dos conexiones acreditadas, una escritura gana
  y otra recibe 409; sin comentario ni auditoría parcial del perdedor.
- QA real local con Chromium: **104 checks, 0 fallos**, vistas 390/1440, 24
  capturas automáticas y PDF de 7 páginas A4. Informe:
  `docs/qa/tasks-contracts/report.md`; evidencia ignorada bajo
  `work/qa-tasks-contracts/`.
- Versiones y footer sincronizados; sin errores de whitespace.
- Prisma generado con verificación TLS activa; build Next de producción
  aprobado, incluida verificación de tipos y artefacto `.next/BUILD_ID`.
- Cuatro pruebas del modo de preparación de release aprobadas: sin push ni
  webhook; ausencia de artefacto e argumentos inválidos bloquean la preparación.
- Contenedores Node 24: dependencias nativas verificadas; build completo
  pendiente por bloqueo de red Alpine. Ver `docs/qa/tasks-contracts/container-node24.md`.

## Integración y publicación

1. Preparar versión v1.0.188 en rama `codex/scale-tareas-contratos` con
   `npm run release:patch -- --prepare`: repetir gates completos y commit de versión.
2. Crear PR referenciando issues, esperar CI verde del candidato y actualizar
   contra `origin/main` antes de integrar. Un único integrador realiza el merge.
3. El merge activa Coolify; no duplicar el deploy. Verificar CI de main, SHA
   del proveedor si está disponible, migraciones y smoke de web/API.
4. No cerrar issues por trabajo local ni sólo por merge. Registrar limitaciones
   externas y pendientes operativos. El estado final se registra en el PR/issues.

La configuración de red guardada es un borrador para revisión; no equivale a
haberla aplicado. GitHub API y Prisma ya respondieron en esta instancia;
producción y Alpine siguen sin verificación por bloqueo del proxy.

## Límites y reversión

OwnData es extracción de RUC; `owncoding-ui` es la biblioteca ya instalada.
Se auditó el repositorio OwnData y se preparó un adaptador explícitamente
optativo, con tests simulados; no se activó ni se consultó el servicio real.
Su uso comercial depende de autorización/licencia y credenciales. No se
verificó Ocoin ni un proveedor IA real; ver #213 y `docs/owndata-scale-integration.md`.
No hay recurrencia de tareas ni envío automático nuevo. Los materiales son
enlaces de archivos/carpetas, no un nuevo servicio de subida binaria.

La prueba móvil es Chromium con viewport, no Android/iOS físicos. La carga de
datos reales, compras (sólo papel compatible), impresión/lectura de etiquetas y
coordinación operativa siguen en sus issues separados. Se conservan seriales y
etiquetas Code 39 existentes; no se reconstruyeron códigos ni se compró equipo.

Revertir código conservando tablas/datos y versiones emitidas. Las migraciones
son aditivas; no eliminarlas para retroceder una publicación ni borrar documentos.
La publicación está autorizada por el dueño; su verificación sigue siendo
un gate obligatorio antes del cierre.
