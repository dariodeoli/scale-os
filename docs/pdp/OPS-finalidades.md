# Operaciones — inventario de finalidades, minimización y retención

_Auditoría PDP del slot SOS-OPS (issue #115). Ley N° 7593/2025 de Protección de
Datos Personales (Paraguay). Reglas canónicas: `dariodeoli/owncoding-ui#8`. Base
técnica: #112 (PLT); UI compartida de transparencia: #113 (DSN). Este documento
alimenta el RAT y la política de retención del job de #112; los textos jurídicos
finales los aprueba el dueño._

## 1. Alcance

Dominio Operaciones: Producción (tablero/planificador), Proyectos, Estudio e
Inventario (catálogo, reservas, retiro/devolución, mantenimiento, verificación y
trazabilidad). No incluye Equipo/Auth (PLT), Clientes como módulo comercial (COM)
ni Finanzas (FIN); cuando OPS reutiliza esas entidades se indica como dependencia.

Hallazgo central: **OPS no captura contacto de terceros** (ni email, ni teléfono,
ni documento) en sus formularios. Los datos personales de OPS son:

1. **Internos** (personas de la empresa): responsables, custodios, quién retira y
   quién devuelve, verificadores, autores de comentarios/historial. Se resuelven
   por membresía activa y se muestran como nombre + foto; el correo solo se usa
   como respaldo del nombre y como identificador de cuenta.
2. **De terceros, por referencia o texto libre**: el nombre del cliente en
   piezas/proyectos/reservas (desde `agency_clients`), y lo que el equipo
   escriba en títulos, descripciones y notas (puede nombrar a personas).

## 2. Inventario de finalidades (OPS)

| Entidad · dato personal | Dónde se captura | Finalidad | Base de tratamiento (propuesta) | Retención propuesta | Dónde se ve |
| --- | --- | --- | --- | --- | --- |
| `agency_clients` · nombre, email, teléfono, RUC/razón social, notas, redes, logo | Alta/edición de cliente (shell; `workspace-forms.tsx`, `client-ruc.tsx`, `suite.tsx`); es compartida con COM | Contacto para coordinar producciones y entregas; facturación | Ejecución de contrato; obligación legal (facturación) | Relación activa + 5 años desde la última operación; luego anonimizar contacto y conservar solo datos fiscales | Clientes (COM), ficha del cliente en Producción (drawer), buscador global (como contexto) |
| `agency_projects` · nombre, fechas, enlaces, responsable principal | Alta de proyecto (`workspace-forms.tsx`); edición en `suite.tsx` | Organizar la producción por cliente | Ejecución de contrato / interés legítimo operativo | 24 meses desde el cierre; luego anonimizar enlaces y conservar métricas | Proyectos (lista/cuadrícula/detalle); buscador |
| `agency_project_assignees` / `agency_work_order_assignees` · usuario asignado | Selector de responsables (`record-assignees.tsx`) | Asignar trabajo y notificar internamente | Interés legítimo / relación laboral | Mientras la pieza/proyecto viva; al cerrar, 24 meses | Tarjetas, planificador, detalle, buscador |
| `agency_work_orders` · título, descripción y notas (texto libre) | Alta de pieza (`workspace-forms.tsx`) y edición (`productivity-ui.tsx`) | Ejecutar y dar contexto a la pieza | Ejecución de contrato / interés legítimo | Piezas cerradas (`approved`/`published`): 24 meses; luego anonimizar texto libre y conservar el registro operativo | Tablero (resumen de 2 líneas + detalle), planificador, detalle de pieza |
| `agency_order_comments` + menciones · autor, cuerpo | Comentarios de la pieza (`commenting.tsx`) | Coordinación interna; nunca se envía al cliente | Interés legítimo operativo | 24 meses desde el cierre de la pieza; luego anonimizar autor/menciones | Detalle de pieza (pestaña Comentarios) |
| `agency_operation_audit` · actor, estados anteriores/posteriores | Automático en cada cambio | Trazabilidad y auditoría | Interés legítimo / seguridad | 24 meses; luego conservar la acción y anonimizar el actor | Historial de la pieza, Historial de trabajo, Actividad |
| `agency_work_checklists` · quién completó cada paso | Checklist de la pieza (`work-checklist.tsx`) | Seguimiento del trabajo | Interés legítimo operativo | Igual que la pieza (24 meses desde el cierre) | Detalle de pieza |
| `agency_studio_reservations` · título y notas (texto libre), responsables | Reserva del estudio (`studio-workspace.tsx`) | Planificar la agenda del estudio | Ejecución de contrato / interés legítimo | 24 meses desde la reserva; luego anonimizar notas y responsables | Calendario y lista de reservas |
| `agency_inventory` · custodio registrado, ubicación “Con persona” | Alta/edición de equipo (`inventory-workspace.tsx`) | Saber quién tiene el equipo | Interés legítimo / custodia de bienes | Mientras el equipo esté activo + 24 meses desde la baja | Catálogo (lista/tarjeta/pipeline), etiqueta impresa |
| `agency_inventory_reservations` (+ members) · responsables, quién devuelve, notas | Reserva de equipos; retiro y devolución | Custodia y trazabilidad del préstamo | Ejecución de contrato / interés legítimo | 24 meses desde la devolución o cancelación; luego anonimizar nombres y notas | Reservas (lista/calendario), detalle del equipo (rastro) |
| `agency_inventory_maintenance` · responsable, descripción | Mantenimiento del equipo | Trazabilidad del mantenimiento | Interés legítimo | 24 meses desde el registro | Detalle del equipo |
| `agency_inventory_verifications` · verificador, observación/diferencias, estados previos | Verificación física | Control de existencia y estado | Interés legítimo / seguridad del patrimonio | 24 meses; luego conservar resultado y anonimizar verificador | Sellos de verificación y detalle |
| `agency_source_events` · autor importado (Trello), cuerpo | Importación puntual de actividad (`import-scale-sources.mjs`); escritura solo admin | Historial de trabajo previo a la migración | Interés legítimo (migración) | 12 meses desde la importación o hasta cerrar la migración; luego eliminar (origen externo, sin obligación de conservación) | Historial de trabajo (solo lectura) |
| Presencia por proyecto (`ProjectPresence`) · usuario activo | En línea, efímero | Indicar quién está viendo/editando | Interés legítimo | Efímero (no persiste) | Avatares de presencia |

Notas de alcance: los datos de equipo (nombre, correo, foto, cargo, salario) son
de `organization_person_identity`/`agency_collaborators` y su retención es de PLT
(#112); OPS solo consume nombre/foto para atribuir responsables. Las fotos de
personas y de clientes se sirven por URL de medio cacheable (#108) y no exponen
el binario en los listados.

## 3. Puntos de captura de terceros y enlaces al aviso

OPS no tiene formularios propios que pidan contacto de terceros; los puntos donde
la agencia carga datos de otras personas son:

1. **Alta/edición de cliente** (shell, compartido con COM): `ClientForm`
   (`app/workspace-forms.tsx`), `ClientRuc` (`app/client-ruc.tsx`) y el editor de
   cliente (`app/suite.tsx`). Necesita, cuando #113 publique el patrón compartido:
   nota de finalidad + enlace al aviso de privacidad + canal de derechos.
2. **Texto libre de OPS** (título/notas de pieza, proyecto, reserva de estudio,
   reserva de inventario, mantenimiento y verificación): el microcopy debe
   recordar no cargar datos de terceros que no correspondan; mismo patrón de
   #113.
3. **Importación de actividad** (`agency_source_events`): el importador guarda
   `source_author` de terceros; queda restringido a administración
   (`activity.view`) y su purga va en la retención de la tabla (§2).

> Pendiente #113: el enlace real, el texto del aviso versionado y el componente
> compartido. OPS no crea variantes locales; estos tres puntos son los únicos
> que deben adoptarlo.

## 4. Minimización

### Aplicada en este issue

- **Correos internos por rol**: los endpoints de responsables
  (`/api/agency/assignees`, `/projects|work-orders/:id/assignees`) y el correo de
  autor en comentarios (`productivity/orders/:id`) ahora devuelven el correo solo
  a quienes gestionan equipo o ven finanzas (`members.manage`/`finance.view`),
  igual contrato que `/productivity/people`. El resto sigue viendo nombre y foto.
- **Proyecciones sin campos sin uso**: se quitaron `checkout_note`/`return_note`
  (el API los acepta pero ninguna UI los lee) de la proyección de reservas y el
  lector muerto `event_data` del rastro (el API manda `context`).

### Verificado (sin cambios necesarios)

- Tablero, planificador, tarjetas de proyecto, pipeline y calendario **no
  muestran email/teléfono/RUC de clientes**: solo nombre/logo y responsables con
  nombre/foto.
- El chrome de OPS solo pide `id,name,email,active,logo_url,color_key` del
  cliente (`CLIENT_CHROME_FIELDS`); no pide teléfono, RUC ni notas. El correo se
  usa únicamente como contexto del buscador global.
- Las consultas de inventario/estudio resuelven personas por membresía activa y
  devuelven solo `id`, `name` y foto; las fotos de OPS viajan como URL de medio.

### Pendiente #113 (con decisión del dueño)

- **Enmascarado de contacto por rol** en las dos superficies donde OPS sí muestra
  contacto de terceros: la ficha de cliente del drawer de Producción
  (`ClientDetail`: email, teléfono, WhatsApp, RUC, notas) y el resultado del
  buscador global (correo del cliente como contexto). Propuesta: quienes no
  gestionan clientes ven contacto enmascarado (`j•••@dominio`, `+595 9•••…`) y
  el RUC solo como identificador fiscal; sin ocultar la identidad.
- Los avisos de finalidad de §3.

## 5. Retención propuesta (para el job de #112)

Reglas por entidad, ordenadas de mayor a menor prioridad. Todas asumen
**anonimización o bloqueo**, nunca borrado de lo fiscal (criterio de #112):

| # | Entidad | Disparador | Plazo | Acción |
| --- | --- | --- | --- | --- |
| 1 | `agency_source_events` | importación | 12 meses | Eliminar el registro completo (autor y cuerpo de origen externo) |
| 2 | `agency_order_comments` (+ menciones) | pieza `approved`/`published` | 24 meses | Anonimizar autor y quitar menciones; el cuerpo queda sujeto a revisión |
| 3 | `agency_operation_audit` | creación del evento | 24 meses | Conservar acción/estados; anonimizar actor |
| 4 | `agency_inventory_verifications` | verificación | 24 meses | Conservar resultado y diferencias normalizadas; anonimizar verificador |
| 5 | `agency_inventory_reservations` (+ members) | devolución/cancelación | 24 meses | Anonimizar responsables y notas; conservar equipos y ventana |
| 6 | `agency_studio_reservations` | fin de la reserva | 24 meses | Anonimizar responsables y notas |
| 7 | `agency_work_orders` | cierre | 24 meses | Anonimizar descripción/notas; conservar estado, fechas, horas |
| 8 | `agency_projects` | cierre/archivo | 24 meses | Anonimizar enlaces; conservar nombre y fechas |
| 9 | `agency_inventory` | baja del equipo | 24 meses | Anonimizar custodio; conservar ficha técnica y valor |
| 10 | `agency_clients` | última operación | 5 años | Anonimizar contacto/notas; conservar identificación fiscal (obligación legal) |
| 11 | `agency_inventory_maintenance` | registro | 24 meses | Anonimizar responsable; conservar costo/descripción operativa |

Criterios que el job debe respetar (pedido a #112): regla **aditiva e
idempotente**, purga por lotes con registro de auditoría, y modo `dry-run` para
revisar qué se anonimizaría antes de aplicar. Las fechas disparadoras salen de
`updated_at`/`status` de cada entidad; no hace falta un campo nuevo, salvo
exportar el “cerrado el” si el dueño quiere plazos exactos desde el cierre.

## 6. Borradores, QA y capturas

- Los fixtures OPS del harness visual y los archivos de origen de la importación
  Trello quedaron anonimizados (nombres, clientes, cuentas y URLs de ejemplo con
  marcadores `de Prueba`/`example`). Ver commits `Refs #115`.
- Las capturas nuevas de este issue (`docs/qa/pdp-ops/`) salen de los fixtures
  anonimizados.
- **Pendiente**: las capturas históricas de `docs/qa/*ops*` (y del resto de las
  verticales) se generaron con la persona del harness anterior y el elenco
  compartido; re-renderizarlas es una campaña transversal única (mismo cambio de
  fixtures para todos los slots). No se reescriben acá para no invalidar la
  evidencia “antes/después” de los issues cerrados.
- No hay datos personales en títulos, URLs ni parámetros de la app: los enlaces
  usan ids (`#project-…`, `#comment-…`); el único enlace con dato personal es
  `wa.me` del cliente, visible en la ficha (pendiente #113).

## 7. Verificación

- `npm run test:release-regression`, `npx next build`, `rg "<<<<<<<" app tests build-tools`.
- Guarda nueva `tests/pdp-ops.test.ts`: fixtures sin el elenco real, proyecciones sin campos muertos, correos internos por rol y sello de verificación sin desborde.
- API (correos por rol): `npm --prefix backend run test:release` (aserciones nuevas en `backend/test-project-assignees.mjs` y `backend/test-productivity.mjs`).
- Capturas: `docs/qa/pdp-ops/README.md`.
