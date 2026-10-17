# Auditoría y decisiones UI — ScaleOS #241

Base: origin/main 0310a41b. Auditoría anterior a los cambios. No se buscó código de OwnCoding UI ni se inspeccionó su implementación durante esta fase. La dependencia ya instalada y sus imports existentes se preservan.

## Inventario y canónicos

El inventario estático completo de controles por archivo está en `inventory-baseline.json`: 118 archivos, 518 botones nativos, 241 con clases estáticas del modelo de acción. Los totales incluyen controles especializados que no son duplicados.

| Familia | Ubicación / consumidores | Duplicación o diferencia | Canónico / decisión | Riesgo y migración |
|---|---|---|---|---|
| Botones e icon buttons | Clases primary/secondary/icon-button en 118 archivos; Button importado en inventario, estudio, clientes, pipeline, planes, finanzas, reportes, presupuestos | Misma acción visual implementada con HTML/clases o import externo | Button local tipado; variantes por props, acciones en consumidor | Migrar modelo de acción, mantener type explícito, form, refs, disabled, handlers. No convertir opciones de listbox/tabs en acciones comunes |
| Búsqueda | search-field.tsx y imports externos en Clientes, Equipo, Inventario, Superadmin | callback string vs ChangeEvent; padding específico | SearchField local con callback de valor | Migrar cada consumidor y quitar compensaciones de CSS |
| Texto, email, contraseña, teléfono | text-field, email-field, password-field, phone-field; Editor y auth | límites email, ID de sugerencias y países de teléfono divergen | Preservar canónicos; corregir adaptadores según contrato del API | No cortar defaults legacy ni sobrescribir datos al montar |
| Monto, porcentaje, cantidad | profile-controls AmountInput; MoneyInput directo en presupuestos/inventario; metadata Editor | entero legítimo por dominio; cantidad coma no normalizada | AmountInput para el contrato local; no confundir porcentaje/cantidad con moneda | Propagar integerOnly; parser de presupuestos requiere cambio comercial separado |
| Fecha/hora/datetime | inputs nativos en Editor, inventario, tareas, presupuestos, cupones | mismo control nativo; límites por dominio | DateInput/TimeInput/DateTimeInput locales sobre controles nativos | Preservar strings civiles, no convertir a UTC. No inventar límites. Calendario nativo depende del navegador |
| RUC | client-ruc, client-editor-data, ClientEditor | proveedor y documento fiscal son contratos diferentes | ClientEditor y RucConfirmCard existentes, proveedor fuera de UI | Aplicar/Descartar explícito; unicidad en backend. No inventar dígito verificador |
| Dropdown/combobox | SelectCustom, PlainSelect, PersonSelect, EntityPicker, AssigneePicker | selección simple vs múltiple, acción vs valor, persona vs entidad | SelectCustom para selección sencilla; PersonSelect combobox; EntityPicker/AssigneePicker composición | Mantener modelos de interacción distintos; compartir opción/contexto sin borrar permisos. Pendiente paridad completa de selección múltiple |
| Identidad/avatar/logo | FotoPerfil, PersonContainer, ActorIdentity, AssignedPeople | identidad principal, auditoría y grupo son modelos distintos | Mantener FotoPerfil base y composición | Algunos consumidores no pasan confianza de foto; no cambiar default global sin contrato de origen |
| Tablas/celdas/paginación | ui-v2 ListGrid/ListRow/ListActions/MoneyText; ventanas de listado por módulo | grid/celdas compartidos; cursor y permisos comerciales | Mantener ui-v2 como adaptador de aplicación | No exportar permisos/endpoints ni formatos comerciales a biblioteca genérica |
| Dialog/modal/drawer | dialog.tsx + ConfirmDialog + SaveActions | tamaños son variantes, no primitivas nuevas | Dialog; ConfirmDialog compone Dialog; SaveActions asocia form en portal | Preservar foco, busy, dirty, Escape, form y confirmaciones |
| Toast/alerta/notificación | notify + NotificationCenter; Aviso/Nota en consumidores | notificación transitoria vs persistida vs error inline | Mantener sistema notify; error de campo inline | No crear segundo centro ni enviar mensajes reales en catálogo |
| Cards/paneles/containers | ui-system.css panel/ops-card, ui-v2 | capas de composición, no reglas comerciales | Tokens existentes + clases canónicas | No reemplazar grids de negocio por contenedores sin semántica |
| Tabs/filtros/acciones | TabScroller, FilterToolbar, ActionMenu, ViewSwitch, SaveActions | navegación, menú de acción y selección tienen teclados distintos | Conservar modelos existentes | No unificar a costa de roles ARIA o selección |
| Loading/empty/error/success | ui-v2 LoadingBlock/EmptyBlock/ErrorBlock, StateChip, notify | estado visual vs decisión de permisos | Mantener adaptadores; catálogo de estados | Nunca inventar datos ni convertir ausencia en cero |

## Arquitectura elegida antes de editar

1. Consolidar modelos locales estables y migrar consumidores existentes.
2. `app/ui/index.ts` expone fundamentos sin endpoints ni permisos; las adaptaciones comerciales siguen en app.
3. Catálogo local opt-in, sin API ni datos productivos; ejemplos de contratos/estados y tema.
4. Solo después revisar compatibilidad externa y preparar propuesta compartible. No publicar una versión remota hasta completar paridad y verificaciones.

Los informes especializados de campos y consumidores se incorporan junto a este inventario. Esta auditoría no acredita interacciones reales de navegador: las validaciones ejecutadas se registran por separado.
