# Tareas y contratos — auditoría y diseño

## Alcance y evidencia inicial (17 de octubre de 2026)

Se auditó el plan solicitado contra proyectos, piezas, personas, clientes,
inventario, plantillas, empresas e integraciones antes de implementar.

| Área | Implementación existente | Brecha y decisión |
| --- | --- | --- |
| Tareas | `agency_internal_tasks`, `productivity.js`, `InternalTasks` en Resumen | Ampliar la entidad existente; no crear otro sistema ni copiar estados de piezas. |
| Proyectos/piezas | Asignaciones múltiples, herencia, comentarios, checklist con versión, Drive | Mostrar las mismas tareas por `project_id` en la ficha del proyecto. Las piezas conservan su flujo de aprobación. |
| Personas | Miembros activos, identidad por `user_id`, capacidades por empresa | Empleado ve sus tareas; asignación de terceros requiere capacidad específica. |
| Empresa | Razón social, RUC, dirección, teléfono, moneda, logo | Añadir ciudad/departamento y representante legal en perfil complementario; registrar procedencia. |
| Plantillas | Plantillas de producción y presupuestos | Contratos legales requieren plantillas de texto y documentos propios; no convertir presupuestos en contratos. |
| IA | Proveedor OpenAI-compatible, Groq predeterminado, `IA_API_KEY` | Reutilizar configuración y protección de salida. Sugerencia opcional; nunca emitir ni aprobar automáticamente. |
| RUC | Proveedor configurable, caché/cuota, confirmación humana y procedencia | OwnData es el servicio señalado por el usuario; no hay contrato/API ni vínculo OwnData verificable en el checkout. Conservar integración actual hasta verificar acceso. |
| UI | `owncoding-ui` desde GitHub, tag fijado; Dialog/Editor y UI v2 | Reutilizar biblioteca y objetos canónicos, sin reemplazarla. |
| Bancos | Cuentas de tesorería con institución, titular, número y moneda | Reutilizar sólo con permiso explícito; no copiar listas de Ocoin sin acceso verificable. |
| PDF | Puppeteer/Chromium, JavaScript deshabilitado y red bloqueada | Reutilizar renderizador para snapshots de versiones emitidas. |
| Activos | Seriales y etiquetas Code 39, 80×50 mm | No hay evidencia de QR. Conservar códigos; probar impresora/lectura requiere hardware físico. |

## Datos, roles y flujos

Se leyó además la memoria versionada en `.engram/chunks/` del 14/10/2026:
reglas de commits en español, migraciones registradas, verificación completa,
flujo PR/CI e historial de versiones hasta 1.0.186. El checkout actual está en
1.0.187. La memoria menciona pendientes previos (Node24 en CI/Docker,
vulnerabilidades, proxy de fotos y auditoría Coolify); son contexto histórico y
no se dan por resueltos ni se modifican como parte de este plan. También se
leyeron `backend/RELEASE-CHECKLIST.md`, `docs/qa/carga-prod/README.md` y las
instrucciones de coordinación versionadas en la rama `docs/comandos-auto-hd`.
Si existe un handoff más reciente en un issue/comentario, falta identificar su
URL: la API GitHub está bloqueada en esta instancia.

### Tareas

La entidad `agency_internal_tasks` se amplía de forma aditiva con responsables,
prioridad, fecha/hora civil de Asunción, cliente/proyecto opcional, checklist,
materiales como enlaces de archivos/carpetas y versión. Los comentarios guardan
autor y momento. El vínculo proyecto-cliente se valida en el servidor y nunca
cruza empresa ni registros archivados.

El listado permite Hoy, Próximas, Vencidas, Completadas y Sin fecha, con filtros
por persona/proyecto/cliente/fecha y paginación. El inicio y el proyecto consumen
el mismo endpoint y el mismo ID; un evento de invalidación refresca ambas vistas.
Cada escritura comprueba `expected_version`; un conflicto devuelve 409 sin
descartar el borrador. No se activa recurrencia ni envío automático: las
plantillas mensuales de piezas y las notificaciones existentes no equivalen a
soporte probado para tareas recurrentes o avisos de esta entidad.

`tasks.view` permite lectura de tareas propias a miembros activos.
`tasks.assign` habilita asignar y consultar al equipo (owner/admin/management/
production por defecto). `tasks.edit` permite editar/completar tareas propias a
roles operativos; viewer sólo lee. Los overrides efectivos del API prevalecen.

### Contratos

Plantilla editable de texto plano con variables permitidas, tipo de acuerdo y
campos obligatorios. Elegir contraparte por ID; precargar datos y procedencia sin
inventar campos faltantes. Un borrador editable tiene revisión optimista. Emitir
requiere revisión humana explícita y todos los campos obligatorios completos.
Cada emisión crea un snapshot inmutable de texto/datos/fuentes; el PDF siempre
se genera desde ese snapshot. La asistencia IA propone cambios, sin guardar ni
emitir; aplicar sugerencia requiere decisión humana.

Capacidades `contracts.view/manage/issue`: owner/admin inicialmente; acceso de
otros roles sólo mediante override explícito. Los documentos que contienen
datos bancarios requieren además `contracts.bank-data.view`, también para
historial y PDF. Los prompts no incluyen credenciales ni salarios. Plantillas y
variables se escapan y el PDF no ejecuta HTML ni accede a la red.

## Validación y entrega

Backend: migraciones reejecutables, aislamiento multiempresa, rol/alcance,
relaciones, validaciones, cambios concurrentes, snapshots y exportación PDF.
Frontend: permisos, estados vacíos/errores, conflictos que preservan edición y
consistencia inicio/proyecto. QA móvil a cargo del agente `qa_audit`, con
Chromium/Puppeteer sobre servicios y datos exclusivamente locales.

Baseline: 227 entradas de regresión frontend pasaban antes del desarrollo. La
suite backend tenía un fallo conocido en `test-studio-reservations.mjs:88`
(reservas fijas del 15/09 fuera de ventana móvil); las otras 43 suites pasaron.
Se corrigió la prueba solicitando el período fijo de sus fixtures, conservando
la ventana móvil de la aplicación y todas las aserciones.
El build requería generar Prisma y la red bloqueaba `binaries.prisma.sh`.

## Pendientes operativos y externos

- La revisión de que *todos* los clientes/proyectos/trabajos estén cargados exige
  inventario operativo y coordinación humana; no se deduce del código ni se
  consulta producción sin autorización.
- Compras: únicamente papel adhesivo compatible con la impresora existente,
  previa confirmación de modelo y tamaños. No comprar impresora ni reconstruir
  códigos. Probar impresión/lectura física queda separado del desarrollo.
- OwnData: repositorio auditado y adaptador opt-in implementado, sin activar;
  habilitación comercial/licencia y secreto empresarial pendientes (#213).
  Ocoin no identificado. Ver `docs/owndata-scale-integration.md`.
- Seguimiento publicado en GitHub: #202–#218; API accesible al preparar la entrega.
- El dueño autorizó implementar, mergear y desplegar. El cierre exige evidencia
  real de CI/publicación y mantiene pendientes físicos/externos abiertos.

## Reversión

Migraciones aditivas: revertir el código de la funcionalidad y conservar tablas
y datos. No deshacer migraciones eliminando documentos/tareas. Mantener las
versiones emitidas inmutables y las tareas previas. Desplegar gradualmente sólo
tras QA y CI; registrar el SHA y resultado real de publicación en el PR/issues.
