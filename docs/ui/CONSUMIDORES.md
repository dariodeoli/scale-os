# ScaleOS #241 — auditoría de consumidores UI

Fecha: 17/10/2026. Rama auditada: `codex/ui-audit-consumers`. Checkout: `work/scale-ui-audit-consumers`.

## Alcance y límites

Auditoría SOLO LECTURA del código de aplicación ScaleOS, antes de inspeccionar OwnCoding UI. Se leyeron `AGENTS.md`, `docs/WORKFLOW.md`, consumidores y pruebas locales. No se inspeccionó el repositorio ni el contenido instalado de OwnCoding UI; sus imports se leen únicamente para identificar consumo real. No hay cambios de código, commits, PR ni publicación. El árbol de trabajo permaneció limpio.

Esto acredita estructura e interacción codificada, no fidelidad visual en navegador ni ejecución contra API. El checkout carece de `node_modules`; no se instaló ni se usó eso para adelantar la revisión de librería.

## Conclusión

ScaleOS YA tiene sistema canónico local con adopción transversal; no corresponde introducir un segundo kit. Hay adaptación parcial a la dependencia compartida, APIs heterogéneas y diferencias concretas entre consumidores. Antes de cambiar el paquete compartido conviene resolver contratos locales y comprobar propagación a varios módulos.

Prioridad más verificable: fotos que reciben URL pero nunca se muestran por omitir la bandera de confianza `verified`. Prioridad arquitectónica siguiente: búsquedas/selects/botones con dos contratos en la misma aplicación y compensaciones CSS que los consumidores repiten.

## Hallazgos priorizados

### P1 — Fotos descartadas en consumidores reales de PersonContainer

- Canónico: `app/person-container.tsx:26`, `verified=false` por defecto; pasa `verificado={verified}` a `FotoPerfil`.
- Implementación: `app/foto-perfil.tsx:43`, solo evalúa `safePhoto(foto)` cuando `verificado` es verdadero. Una URL válida no basta por sí sola.
- Consumidores que entregan `photoUrl` pero omiten `verified`:
  - `app/employee-tasks.tsx:58`: personas en asignación de tareas.
  - `app/finance-balance.tsx:44`: custodio de cuenta en Balance.
  - `app/sections/finanzas.tsx:196`: custodio de cuenta en Finanzas.
  - `app/inventory-workspace.tsx:178`: propietario de equipo.
  - `app/entity-picker.tsx:69`: rama de opciones mixtas con `option.person`; su rama TODO personas toma PersonSelect y es otra trayectoria.
- Diferencia: Equipo (`app/team-workspace.tsx:186,201`), comentarios, responsables y Superadmin sí pasan `verified`; muestran la foto del mismo tipo de objeto mientras las vistas anteriores solo iniciales.
- Riesgo: no cambiar `verified` globalmente a true. Hay identidad importada/no verificada que intencionalmente debe conservar iniciales (`ActorIdentity`). Primero acreditar que las fotos concretas proceden de datos API autorizados, no de autoría importada.
- Migración: pasar confianza explícita en los consumidores acreditados, manteniendo `safePhoto`, URL interna versionada, fallback y variantes persona/logo. No crear PersonAvatar nuevo.
- Prueba necesaria: fixture de una misma persona en tareas, custodio Balance/Finanzas y propietario Inventario; img con URL segura; sin URL/URL insegura/imagen fallida deben caer a iniciales. Cubrir autorización salarial/contactos por separado.

### P1 — Dos SearchField con distinto contrato y CSS compensado por consumidor

- `app/search-field.tsx:7`: `label`, `onChange(value:string)`, sin botón de limpiar; etiqueta visible opcional, CSS `app/search-field.css`.
- Consumidores: `app/entity-picker.tsx:59`, `app/assignee-picker.tsx:60`, `app/contracts-workspace.tsx`.
- Otros módulos importan `SearchField` directamente del paquete: Clientes (`app/client-directory-toolbar.tsx:12,77`), Equipo (`app/team-workspace.tsx:3`), Inventario, Planes, Presupuestos, Finanzas, Mora, Superadmin access/audit/agencies/usage.
- Esos consumidores usan `ariaLabel`, `onChange(ChangeEvent)` y algunos ajustan hijos DOM desde clases locales. Clientes tiene `!pl-9/!pr-9` y tamaños del botón; comentario en línea75 reconoce colisión de padding global de `ui-system.css` con lupa absoluta.
- Diferencia funcional/visual: firma string vs evento, etiqueta, clear, padding/icono y alturas (local 40 escritorio/48 móvil; otros targets se fuerzan por pantalla).
- Canónico a elegir: UN adaptador ScaleOS que conserve contratos de dominio y envuelva el objeto compartido solo después de verificar su API en la fase posterior. No copiar el componente del paquete. La primera unidad puede usar wrapper local como frontera; eliminar overrides solo después de verificar DOM/render.
- Migración transversal real: Clientes + Equipo + Superadmin agencias, además de actuales EntityPicker/AssigneePicker. Mantener placeholder restringido por permiso (`contactVisible`) y callbacks de filtros; no convertir selección ni búsqueda de responsables.
- Riesgo: pruebas de Equipo/Clientes buscan literal import/JSX; distinguir pruebas estructurales de comportamiento y actualizar solo las que cambien legítimamente.

### P2 — Selección de personas inferida por texto y foto, en vez de semántica explícita

- `app/profile-controls.tsx:37`: SelectCustom escoge PersonSelect si alguna opción contiene photoUrl (incluso null/undefined explícito) O label coincide con regex de personas; otras usan PlainSelect local.
- `PersonSelect` adapta BuscadorPersonas compartido; conserva Escape hacia Dialog cuando desplegable ya cerrado. PlainSelect implementa buscador a partir de 9 opciones, portal dentro de Dialog, posición, navegación y cierre propios (`:56–86`).
- Consumidores: Editor (74 coincidencias JSX aproximadas de SelectCustom, 29 archivos), equipo, inventario, superadmin, filtros de empleados, finanzas.
- Caso equivocado concreto: `app/inventory-workspace.tsx:732`, selector de Proyecto genera `kind:'person'` con photo_url del proyecto; identidad de entidad entra al motor de personas.
- Coexiste Select compartido/nativo para opciones cortas (Clientes estado, filtros Superadmin) y select nativo país de PhoneField/demo/privacidad. No son todos duplicados intercambiables: búsqueda larga, selección simple y multiselección necesitan contratos distintos.
- Canónico: separar elección explícita de persona/entidad/opción con default retrocompatible, conservar PersonSelect/SelectCustom como fachada. EntityPicker admite context/saldo y selección de entidad; AssigneePicker es multiselección con responsable principal, no sustituir por select simple.
- Riesgo: perder contexto monetario, allowEmpty, disabled, desplazamiento, interacción Escape anidada y teclado.

### P2 — Botones de dos sistemas; canonizar sin destruir semántica de formularios

- Botones HTML con clases `primary/secondary/text-button/icon-button` en Dialog, Editor, SaveActions, Equipo, configuración y Superadmin. Otros usan Button/IconAction compartidos en comercial, inventario, producción y finanzas.
- Inventario léxico (no AST, incluye comentarios/tipos): 519 coincidencias `<button` en113 archivos, 81 `<Button` en15. No todos son duplicación: triggers de avatar, radio/opción, switch de empresa y enlaces tienen contratos propios.
- `app/ui-system.css:203–253,366–398` impone altura, color, borde/foco y disabled global a clases antiguas. `client-directory-toolbar.tsx` aplica Button compartido con clases propias; estos dos caminos dificultan propagación coherente.
- Canónico ya disponible: ActionMenu (`app/ui-v2.tsx:72`) para acciones de registro, ConfirmDialog para mutaciones peligrosas, SaveActions/FormActions para formularios. No introducir Button nuevo por módulo.
- Riesgo funcional importante protegido: FormActions (`app/dialog.tsx:175+`) asocia `form` a los hijos `<Button type='submit'>` aunque estén en portal del footer. Un cambio de wrapper que pierda type/form rompe guardar. No eliminar esa capa.

### P2 — Diferencias de plantilla de tabla/tarjeta y toolbar

- Canónicos: `app/ui-v2.tsx` ListPage:516, FilterToolbar:540, ListGrid:557, ListRow:597, CompactCard:313, ViewSwitch:170. Con semántica table/cell, scroll enfocable, plantilla compartida, acciones fijas.
- Clientes (`app/sections/clientes.tsx:68,118,327`) comparte CLIENT_TEMPLATE y acciones entre lista/cuadrícula, pero construye ClientDirectoryToolbar propia con título y búsqueda/estado. Equipo (`app/team-workspace.tsx`) utiliza ListPage+FilterToolbar y CompactCard.
- Superadmin (`app/superadmin/reports.tsx:175+`, agencies/errors/access) usa tabla según ancho y tarjetas propias con `useDenseTableFit`; son consumidores reales de primitivas, no repetir DataTable desde cero.
- Diferencia intencional: listas clientes contienen columnas comerciales/contacto con minimización por rol; equipo separa estado laboral/permiso/acceso. No homogeneizar datos bajo una tabla única rígida.
- Migración: mantener slots de dominio sobre el mismo marco. Unificar estilo/composición y acciones, conservar plantilla y paridad de datos por módulo.

### P2 — Identidad empresarial incompleta en Mis empresas

- Canónicos disponibles: FotoPerfil (`variante='logo'`), ClientIdentity, PersonContainer variante logo y CompanyMark del selector.
- Selector actual `app/operations.tsx:347–410` usa logo de sesión y evento `scale:company-logo-changed`; una empresa única no se presenta como desplegable.
- `app/company-settings.tsx:10,50+`: tipo Company no incluye logo y cada fila de empresas usa icono Building2, mientras superadmin agencies sí usa logo y propietario con foto.
- No es suficiente cambiar icono: revisar contrato de `/api/auth/organizations` y llevar logo legítimo en respuesta antes de adaptar consumidor; mantener filtro demos, aislamiento tenant, empresa predeterminada y refresh de evento. No inventar propietario a partir de rol.

### P3 — Navegación visual parecida no implica misma interacción

- `app/ui-v2.tsx:497` ViewTabs sobre TabScroller+SegmentedField: inventario, producción, PersonSheet.
- Shell `app/scale-workspace.tsx:929`: TabScroller con Link y aria-current para rutas.
- Finanzas/Comisiones: Subtabs compartido; Equipo/Presupuestos/Mora: SegmentedField filtra datos.
- No fusionar tabs de ruta, filtros y fichas con un onChange global: conservar URL, historial, selección, paneles visitados y persistencia de borradores (`app/person-sheet.tsx:31+`). Lo compartible es la presentación/targets/scroll, con adaptadores semánticos.

## Matriz de fuentes canónicas locales y consumidores

| Objeto | Fuente local | Consumidores comprobados | Duplicación / diferencia | Acción y riesgo |
|---|---|---|---|---|
| Overlay/modal/drawer | dialog.tsx:Dialog,ConfirmDialog,useOverlay | Editor, clientes, inventario, Equipo, perfil, superadmin | PhotoViewer/MobileDrawer usan useOverlay para visor/nav, no editor completo | Conservar foco, stack, cierre busy/dirty, portal y retorno de foco; no reemplazo ciego |
| Footer guardar/cancelar | dialog.tsx:FormActions; save-actions.tsx | Editor, workspace-forms, inventario, previsión, presupuestos | Algunas acciones de acceso son inline porque guardan una pestaña | Mantener form association y cancel guard; no forzar submit a cada botón |
| Formulario simple | operations.tsx:Editor | perfil/equipo, settings, oportunidades, planes | Formularios complejos inventario/cotización usan controles compartidos directamente | Unificar controles, no meter workflow entero en esquema Field |
| Personas/fotos | FotoPerfil,PersonContainer,ActorIdentity | Equipo, superadmin, comentarios, responsables, clientes | verified omitido; misempresas sin logo | Confianza explícita; fallback, foto segura, no revelar importados |
| Búsqueda | search-field.tsx y imports compartidos | pickers/contratos frente Clientes/Equipo/Inventario/Superadmin | Dos firmas y estilos | Adaptador único + migración a consumidores, pruebas teclado/clear/permiso |
| Selección simple/persona/entidad | profile-controls.tsx; entity-picker.tsx | Editor, asignación, cobros, inventario, superadmin | Heurística label/photo + proyecto marcado persona | Semántica explícita manteniendo API; no romper multiselección |
| Acciones de registro | ui-v2.tsx:ActionMenu,ListActions | Equipo, clientes, Pipeline, inventario, superadmin | Botones sueltos primary/secondary aún coexisten | Propagar mismo menú y confirmación donde aplica; conservar permisos |
| Listas/cards | ui-v2.tsx:ListPage/ListGrid/ListRow/CompactCard | Equipo, clientes, módulos, superadmin | Toolbar clientes propia, cards superadmin adaptativas | Slots canónicos, paridad datos, scroll y no recortar montos |
| Estados/KPI | ui-v2.tsx:StateChip/Kpi/KpiStrip/EmptyBlock/ErrorBlock | módulos y superadmin | PlatformNotices específico auth/bootstrap | No dibujar panel a no autorizados; no reemplazar estado bootstrap por pantalla genérica |
| Campos tipados | EmailField,PhoneField,AmountInput,TextField,PasswordField,field-label | Editor y formularios de acceso/perfil | Inputs directos complejos y MoneyInput directo | Respetar normalización/dato mostrado, moneda, pegar/autofill y errores |

## Primera unidad implementable recomendada

**Corrección transversal de foto de persona en consumidores API** (sin cambiar librería):

1. Confirmar procedencia/autorización de `context.people.photo_url`, `account.custodian_photo_url` e `item.owner_photo_url` en proyecciones locales/API con responsable de datos.
2. Preservar PersonContainer/FotoPerfil como únicos; no modificar default de confianza ni ActorIdentity importado.
3. Corregir consumidores Tareas, Balance, Finanzas e Inventario para pasar verificación explícita cuando sus datos lo acrediten. Rama mixta EntityPicker requiere contrato de opción verificada; no marcar cualquier opción externa automáticamente.
4. Prueba de render con fixture foto existente y ausencia/insegura/fallida, en CUATRO consumidores reales; controles de roles y ausencia de datos sensibles.
5. Revisar visualmente escritorio/móvil en aplicación local. Ejecutar regresiones y build solo en fase de implementación con dependencias instaladas y respetando workflow.

Resultado exigible: la misma persona deja de verse como iniciales en unos módulos y foto en otros, sin una segunda implementación y sin tocar producción. Se puede revisar en diff pequeño y consumidores reales. Esta unidad NO resuelve toda la deuda de búsqueda/select/botones; eso queda para las unidades siguientes.

## Pruebas existentes y verificación de esta auditoría

Ejecutadas sin instalar dependencias:

- `node tests/field-adoption.test.ts` — PASS. Contratos estáticos de teléfono/email/serial/token/nombres y adopción.
- `node tests/selection-geometry.test.ts` — PASS. Contrato estático rail/drawer/tabs sin cambio de geometría al seleccionar; NO mide navegador.
- `git status --short` — limpio; rama `codex/ui-audit-consumers`.

Revisadas como cobertura existente, NO ejecutadas aquí:

- `tests/actor-identity.test.tsx`: fotos verificadas/importadas, URL insegura/interna versionada, fallback y fechas.
- `tests/mobile-photo-identity.test.ts`: CSS/targets y retiro de avatares paralelos; especifica que no usa motor de layout.
- `tests/assignee-picker.test.tsx`: selección múltiple/principal y contrato propio.
- `tests/dsn-popups-183.test.tsx`, `dialog-interactions.test.tsx`, `save-actions.test.tsx`, `editor-save-completion.test.ts`: foco, dirty/busy, confirmaciones y cierre tras guardar.
- `tests/client-directory-toolbar.test.tsx`, `team-toolbar-density.test.ts`, `ui-v2.test.tsx`, `bulk-selection-185.test.tsx`: toolbar, permisos y listas/vistas.
- `tests/select-position.test.ts`: geometría pura del desplegable; no cubre integración real de portales.
- `tests/superadmin-mobile-155.test.tsx`, `superadmin-errores-reportes.test.tsx`, `superadmin-coupons-189.test.tsx`: contratos de panel global.

No ejecutados: tsc, build, regresión completa, frontend con backend, OAuth ni pruebas físicas. No se reportan como verdes. Node local24.21.0; tests TypeScript estáticos lanzados mediante soporte de Node24. Hubo warning MODULE_TYPELESS_PACKAGE_JSON, sin fallo.

## Pendientes que deben integrar la revisión final

- Inspección visual/runtime local del app para confirmar densidad, foco, overlays y fotos con fixtures; no confundir contrato textual con resultado visual.
- Revisión OwnCoding UI SOLO DESPUÉS de terminar mapa local de todos los auditores: confirmar APIs/estados ya disponibles sin inventar componentes.
- Confirmar datos de foto en API antes de otorgar confianza y logo en organizations antes de anunciar paridad empresarial.
- Medir CSS en puntos de entrada shell, portal y superadmin: las reglas globales pueden explicar diferencias aunque los componentes sean iguales.
- Canonizar búsqueda y selectors por unidades con adopción efectiva en Clientes/Equipo/Inventario/Superadmin, preservando filtros, roles y workflows.
- Auditoría presente no toca main, repositorio remoto, releases ni deployments.

## Unidad implementada después de entregar el inventario (autorización del coordinador)

Se priorizó **SearchField** para esta rama, manteniendo fotos/confianza pendientes. Se migraron TODOS los imports directos de SearchField del paquete a `app/search-field.tsx` (15 archivos, 16 instancias migradas; el inventario total de consumidores incluye los locales anteriores). Se conservaron labels accesibles, filtros y minimización de contactos; callback local siempre recibe string. Se incorporó limpiar con type=button y retorno de foco, estado disabled y enlaces de error; se retiraron overrides de padding de cada consumidor. No se tocó `ui-system.css`, Button ni la librería.

Validación focal: test nuevo 5/5 (componente + Clientes real + Superadmin real + adopción total), Clientes existente7/7, Equipo5/5, Superadmin12/12, AssigneePicker PASS. `tsc --noEmit --incremental false`: PASS. Regresión completa y validación visual se informan por separado en el handover final; no se acreditan automáticamente con estos tests. El test de Clientes que prohibía importar buscador local se actualizó explícitamente al contrato de la consolidación #241, manteniendo sus garantías de select/vista y permisos.
