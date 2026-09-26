# Scale OS — interfaz compartida

## Identidad de autores — 11-09-2026

`ActorIdentity` es el bloque común para comentarios de proyectos/piezas, actividad, historial, invitaciones, cobros, transferencias y uso del equipo. Muestra foto circular de 32 px, nombre completo sin recortar y fecha opcional debajo. Usa tokens de superficie, línea y texto; el nombre se ajusta al ancho móvil. No es un botón ni indica presencia: no agregar punto verde a un autor histórico.

- `name`, `photoUrl`, `verified`, `timestamp` y `imported` son sus propiedades. `verified` significa atribución confirmada por el servidor, nunca permiso de acceso.
- Sin foto o ante error de carga: iniciales. Imagen decorativa con nombre visible accesible, sin duplicar su lectura. Fecha válida usa `time` y formato local; una fecha inválida no se inventa.
- Preferir identidad personal compartida confirmada por servidor; correo solo como alternativa. No emparejar personas por parecido de nombre ni atribuir fotos actuales a autores importados sin identificación fiable. Los registros importados se etiquetan.
- No modificar el contenido, autor original, fechas ni permisos de los registros al mejorar su presentación. No realizar una solicitud extra por cada avatar.

## Responsables en tarjetas — 11-09-2026

`AssignedPeople` es el contenedor compartido de responsables en las tarjetas de Producción y en Proyectos (lista y cuadrícula). Reutiliza `ActorIdentity`, con avatar decorativo de 24 px, nombre completo y etiqueta Principal cuando la confirma el servidor. Una sola superficie sutil, borde y radio semánticos; separaciones de 4/8 px mediante los tokens `--ui-space-*`. El ajuste de filas permite ver completas las 2–5 personas habituales y también todas las adicionales: sin `+N`, elipsis, altura fija ni desplazamiento interno. Nombres largos se parten sin ensanchar la tarjeta.

- La sección tiene nombre accesible «Responsables asignados» y una lista semántica. No añade botones, escrituras ni peticiones por persona. Foto ausente, inválida o fallida usa las iniciales de `ActorIdentity`; el correo confirmado es alternativa al nombre.
- Contrato: Proyectos usa `assignees: [{id, full_name, email?, photo_url, is_primary}]`, resuelto por ID y empresa. Producción muestra `effective_assignees` junto con `assignee_source` (`direct`, `project` o null), según la selección explícita del servidor; conserva `assignees` como asignaciones directas y `project_assignees` como contexto, sin mezclarlas ni recalcular herencia en el navegador. Si la fuente es `project`, etiqueta «Responsables del proyecto» y «Principal del proyecto»: no son asignaciones guardadas de la pieza. `[]` confirma que no hay responsables; campo ausente/null, respuesta inválida o error significa «Responsables no disponibles». La carga tiene su propio estado. Nunca usar IDs de filtros o alias de Trello para inventar un nombre, foto o responsable principal.
- «Responsables» expresa asignación, no presencia. `ProjectCardPresence` conserva su bloque separado «Viendo ahora». No se mezclan sus personas, puntos de actividad ni tiempos con las asignaciones; ninguno de estos bloques mide horas trabajadas o amplía permisos.
- El CSS compacto se limita a `.assigned-people`; no cambia los autores históricos. Pruebas de componente cubren cinco y más personas, nombres completos, alternativas de foto, estados honestos y separación de presencia. Los contratos CSS verifican ajuste; no sustituyen QA visual/táctil.

## Primer ingreso y preferencias — 11-09-2026

- La guía muestra instrucciones según capacidades del rol, no solo visibilidad del módulo. El bloque de Primeros pasos es optativo, plegable y descartable; Guía del panel sigue disponible. No abre ventanas ni realiza escrituras de negocio automáticamente.
- La evidencia de clientes/proyectos/piezas está vinculada a usuario, empresa, rol y demo. Carga, error y ausencia de información no significan cero registros. La demo informa datos de ejemplo; nunca marca una lección como completada por tener registros precargados.
- Preferencias personales de inicio y filtros del tablero: almacenamiento local versionado por usuario/empresa. No sincroniza dispositivos ni guarda credenciales o datos de órdenes. Si el almacenamiento falla, la interfaz sigue funcionando e informa que el cambio es temporal.
- El inicio preferido solo puede aplicarse una vez al entrar en la raíz sin parámetros ni fragmentos y con sesión/acceso confirmados. No reemplaza enlaces explícitos, retornos de autenticación o facturación, ni navegación posterior.
- Filtros combinables por cliente, asignación y semana local de lunes a domingo; reglas relativas, no fechas congeladas. Conserva los estados del tablero y ofrece restablecer. La interfaz deja claro cuándo el cliente guardado ya no existe.
- Búsqueda: el destino de las órdenes es Producción, coherente con el texto del botón. El icono de marca se sirve desde los archivos locales de la app para no depender de la web de la agencia.

Estos patrones reutilizan contenedores, botones y selectores existentes; no crean permisos ni rutas de servidor nuevas. La revisión visual sigue pendiente del acceso permitido al navegador. Las evidencias de pruebas y publicación se registran por separado en `backend/RELEASE-CHECKLIST.md`.

## Alcance del rediseño

La base visual común vive en `app/ui-system.css`, cargada desde el layout raíz. Se aplica al espacio de trabajo y a los diálogos que se montan fuera de él. No cambia la landing, roles, precios ni datos. Las distribuciones específicas de Producción, calendario e informes se conservan.

| Patrón | Uso y regla |
| --- | --- |
| `.panel` | Una superficie por sección, radio de 12 px y padding común. Los paneles anidados no añaden otro borde y padding. |
| `.ops-card`, tarjetas de clientes, proyectos, inventario e informes | Contenido agrupado, radio común, separación de 12 px y padding de tarjeta. |
| `.ops-stack`, `.finance-grid` | Separación de 16 px entre secciones, sin sumar márgenes duplicados. |
| `.panel-heading` | Título y acciones en una fila cuando caben; se reorganizan al reducir ancho. |
| `.form-stack`, `.ops-form-grid` | Campos relacionados en columnas flexibles; texto largo a ancho completo y una columna en móvil. |
| Botones | Primario, secundario, selección y acción textual. Hover/selección no cambian peso ni dimensiones. Destructivos conservan color y confirmación. |
| Estados | Espera visible, acciones deshabilitadas al enviar, error legible conservando los datos. |
| Tablas y cifras | Cifras tabulares; monedas separadas. Las tablas anchas tienen su propio desplazamiento horizontal. |

## Selector de vista

Para colecciones que ofrecen cuadrícula y lista se usa ViewToggle: un control segmentado compacto con icono de cuadrícula e icono de lista. No se colocan las palabras “Cuadrícula” o “Lista” dentro del control. Cada botón conserva aria-label, title y aria-pressed; la opción activa usa el color de marca y la preferencia se guarda por persona en su navegador. El patrón usa tokens semánticos y funciona sobre temas claros u oscuros.

## Identificación de inventario

Cada unidad de inventario recibe un código visual estable `SC-000001`, derivado de su ID numérico inmutable. Se muestra bajo el nombre en tarjetas, en el editor existente y se incluye en búsquedas. La etiqueta usa Code 39, impreso con nombre, categoría, serie/IMEI cuando exista y última ubicación registrada. El botón «Etiqueta» no cambia datos: abre la vista de impresión de una única unidad. No reutilizar códigos archivados ni permitir que una etiqueta sustituya la serie, IMEI, custodio, reserva o verificación física.

En lista se priorizan tres columnas: identidad y estado, ubicación/trazabilidad y acciones. Las tarjetas mantienen los mismos datos, pero agrupan metadatos secundarios para evitar filas dispersas. A 820 px o menos, la lista vuelve a una columna legible sin esconder información.

## Tokens

Espaciado: 4, 8, 12, 16, 20 y 24 px (`--ui-space-1` a `--ui-space-6`). Controles de 40 px en escritorio y 44 px en móvil; inputs móviles de 16 px para evitar zoom involuntario. Paneles: padding de 20 px, 16 px en móvil. Tarjetas: 16 px, 14 px en móvil. El tablero y los controles de arrastre mantienen su distribución especializada.

Los bordes de campos usan `--ui-field-border`, con contraste mínimo 3:1 frente a blanco y superficie sutil. Colores semánticos, radios y tipografía heredan las variables de marca existentes. Se conserva la preferencia de movimiento reducido.

## Ventanas y formularios

- `Dialog`: cabecera, cuerpo desplazable y pie separado; tamaños predeterminado, compacto y amplio, además de ficha lateral.
- Escape actúa sobre la ventana superior. Un selector personalizado abierto consume Escape primero; los selectores nativos conservan el manejo de su menú por el navegador.
- El foco permanece en la ventana y vuelve al control anterior al cerrar. Tab y Shift+Tab incluyen inputs, selectores, enlaces y botones habilitados.
- `useDialogPending(pending)` registra cada formulario por separado. Un formulario inactivo no desbloquea otro que está guardando. Durante el envío se impide cerrar con Escape, fondo o botón de cierre.
- `Editor`: validación con errores vinculados al campo, indicación de opcionales, ayudas y botón Cancelar dentro de ventanas. Sin Cancelar añadido a formularios de página.
- `closeOnSave` es optativo: los editores simples pueden cerrar tras éxito; una ficha con comentarios, checklist u otras acciones no desaparece tras cada guardado parcial. Los callbacks existentes de guardado conservan sus cierres explícitos.
- Un fallo de persistencia conserva el formulario. Una actualización visual posterior fallida no debe presentarse como si los datos no se hubieran guardado.
- `SaveActions` aplica el mismo pie a formularios específicos de altas, presupuestos y reservas. `completeSave` se llama solo después de persistir; cierra antes de actualizar la lista y convierte un fallo de esa actualización en advertencia, sin sugerir repetir la escritura.
- Los ocho formularios heredados del espacio de trabajo usan `useSingleFlightSubmit`: el bloqueo empieza antes de la validación asíncrona y pertenece al envío original. Un segundo clic no inicia otra petición ni desbloquea el pie mientras queda una escritura pendiente. La transferencia entre monedas también registra su guardado y mantiene bloqueados sus campos y todas las vías de cierre. La reversión cierra solo después de persistir, antes de refrescar la lista.
- Los comentarios usan `resetOnSave`: vacían únicamente el texto publicado, sin cerrar la ficha. Suscripción dentro de una ventana usa la variante embebida sin otro título visible ni tarjeta duplicada.
- La vista previa de presupuestos no hereda la altura/ancho de la barra lateral aunque use `<aside>`; importes y textos se reorganizan sin puntos suspensivos que oculten cifras.

## Cobertura y límites

La capa compartida cubre Resumen, Producción, Clientes, Proyectos, Presupuestos, Finanzas, Equipo, Pipeline, Inventario, Informes y Configuración mediante sus componentes comunes; no implica que cada pantalla tenga un diseño exclusivo nuevo. Mi perfil añade agrupación de identidad, nombre y fotografía, correo de solo lectura y explicación de alcance personal/demo.

Pruebas: comportamiento de diálogos y formularios en entorno aislado, regresiones existentes, contratos de CSS y compilación limpia. Los contratos a 320/360/390/768 px no sustituyen capturas ni pruebas táctiles. La revisión visual en navegador continúa bloqueada por la verificación de política administrativa; no se intenta un acceso indirecto.

Antes de publicar: pruebas completas, compilación sin cambios ajenos WEEM/Dadoo, revisión independiente, commit exacto y salud del despliegue. Si falla navegación, guardado o foco, revertir el código de esta entrega a `daf8e5615e53bf1a0802c2f2baa0ff7a84f4c4f8`; no borrar datos. Esta entrega no necesita migración ni activación de servicios externos.

Verificación local de esta entrega: 94 resultados de pruebas aprobados y compilación de 41 rutas sobre export limpio. Revisión independiente cerró los defectos de ancho/altura y truncado de importes del preview. Se verificaron flujos de guardado/error/reintento, formularios específicos y aislamiento de ventanas con dobles locales. Publicación y salud se confirman por separado; no se acredita una revisión visual ni un monitoreo extendido de 15 minutos.
# Urgencia de proyectos y piezas

Patrón compartido en `app/urgency.tsx`: 1 Baja, 2 Moderada, 3 Media, 4 Alta, 5 Crítica; `null` representa **Sin definir**, nunca una urgencia implícita. Proyecto y pieza son independientes: no hay herencia, cambio de prioridad ni cambio de aprobaciones. Datos ausentes o inválidos se muestran como **No disponible**.

Creación usa un selector nativo con etiqueta vinculada y ayuda permanente mediante `aria-describedby`, navegación de teclado nativa, texto de 16 px y objetivo mínimo de 44 px. Edición reutiliza las opciones y ayuda en el selector accesible de Editor; el botón principal guarda detalles, urgencia y responsables en una transacción, conservando el borrador ante errores o conflictos. No hay guardado automático. Estado pendiente deshabilitado; errores siguen el contrato existente del formulario.

La etiqueta en tarjetas y detalle muestra número y nombre, sin depender del color. Reutiliza tokens `--text`, `--text-muted`, `--surface`, `--line` y `--ui-space-2`; permite ajuste de línea y no agrega acciones a las tarjetas. Verificación automatizada: `tests/urgency.test.tsx`; servidor: `test-urgency.mjs`. Revisar teclado y lector de pantalla reales antes de la publicación.

## Sistema v2 (Tailwind + owncoding-ui) — 22-09-2026

Decisión del dueño (campaña #41): la base del rediseño es **Tailwind CSS 3.4 +
`owncoding-ui` v0.12.0**. El CSS plano legado convive durante la migración y se
retira cuando cada pantalla se rediseñe. **No se crean hojas de componente
nuevas**: lo nuevo se escribe con utilidades Tailwind y objetos de la librería.

### Montaje y convivencia

- `tailwind.config.mjs` usa el preset de `owncoding-ui`, escanea `app/`, el
  bundle de la librería y los fixtures del harness visual. `postcss.config.mjs`
  corre Tailwind + autoprefixer sobre todo el CSS (las hojas legadas no cambian).
- Orden de carga en `app/layout.tsx`: `owncoding-ui/styles.css` (tokens y base
  del grupo) → hojas legadas (`globals`, `qa-fixes`, `mobile-forms`,
  `ui-system`) → `app/tailwind.css` (hoja del sistema: utilidades y tokens de
  marca). Las utilidades salen después del CSS legado: en un mismo elemento
  gana Tailwind; las hojas de módulo legadas siguen mandando en sus pantallas.
  La base de elementos de la librería (Space Grotesk, titulares balanceados,
  mono en campos numéricos) se neutraliza en la hoja del sistema para conservar
  Outfit/DM Mono y las métricas legadas, sin tocar tokens ni objetos.
- **Preflight desactivado** (`corePlugins.preflight = false`): el reset global
  rompería las 53 hojas actuales (márgenes, títulos, listas, bordes). En su
  lugar, la hoja del sistema trae una **base mínima**: `border-width: 0` +
  `border-style: solid` + color heredable para que funcionen las utilidades
  `border*` (incluye `button`, que el legado fija `border:0`). El ancho 0 es
  obligatorio: sin él, cualquier elemento sin borde declarado toma el ancho
  inicial `medium` (3 px) y cambia todas las métricas. No se resetean
  tipografía, márgenes ni listas. Evidencia: build en verde y harness visual de
  Clientes/Resumen/Configuración a 360/768/1440 con paridad exacta contra
  `main` (mismos 17 hallazgos preexistentes de altura de fila, 0 nuevos);
  capturas en claro/oscuro en `work/visual-harness/*/captures`. Cualquier
  excepción se corrige en la base, no por pantalla.
- **Tema oscuro**: Scale OS sigue usando `html[data-theme="dark"]` (script del
  layout). Tailwind se configura con `darkMode: ['selector', 'html[data-theme="dark"]']`,
  así los `dark:` del preset y de la librería siguen el tema legado sin depender
  de la clase `dark` y sin duplicar temas.
- **Fuentes**: `fontFamily` mapea `sans`/`display` a Outfit y `mono` a DM Mono;
  la marca no cambia.
- **Tokens**: la paleta legada se publica como canales RGB en `--c-paper`,
  `--c-fore`, `--c-ink-950/900/800/700/600/500`, `--c-mute`, `--c-fono`,
  `--c-fono-dark`, `--c-fono-light`, `--c-ok`, `--c-bad`, `--c-warn`, `--c-info`
  y `--c-onbrand` (claro en `:root`, oscuro en `html[data-theme="dark"]`).
  Los objetos de la librería toman de ahí sus colores; no se hardcodean colores
  nuevos por pantalla.

### Adopción de la librería

- **Ya disponible y de uso obligatorio en lo nuevo**: `Button`, `Input`,
  `Textarea`, `Select`, `Label`, `FormField`, `MoneyInput`, `PasswordInput`,
  `SearchField`, `Switch`, `SegmentedField`, `PercentField`, `CurrencySelect`,
  `PhoneField`, `EmailField`, `SerialField`, `Card`, `Stat`, `PageHeader`,
  `EmptyState`, `ErrorState`, `Skeleton`, `Aviso`, `Nota`, `Badge`, `Dot`,
  `IconAction`, `FilaDato`, `CeldaMoneda`, `BarraProgreso`, `Subtabs`,
  `Modal`/`ConfirmDialog`/`Drawer`, `ListGridToggle`, `DataTable`.
- **Todavía no portado (sigue legado, sin duplicar)**: `Dialog` con pending por
  formulario (`useDialogPending`), `SelectCustom` buscable, `SaveActions` +
  `useSingleFlightSubmit` y el contrato de listas densas. Su port a la librería
  se coordina por `dariodeoli/owncoding-ui#2`; hasta entonces se usan como
  están y no se crean variantes paralelas.
- Los primitivos de aplicación viven en `app/ui-v2.tsx`: `Kpi`/`KpiStrip`
  (envuelven `Stat` + `CeldaMoneda`), `StateChip` (envuelve `Badge`) y
  `LoadingBlock` (envuelve `Skeleton`). Vacío, error y avisos se usan directo
  de la librería (`EmptyState`, `ErrorState`, `Aviso`, `Nota`).

### Patrones compartidos v2 (`app/ui-v2.tsx`)

Los dominios no inventan variantes: si falta un patrón, se agrega acá con test
y esta sección se actualiza.

| Patrón | Regla |
| --- | --- |
| `PageHeader` | Eyebrow + título + acciones. El título **no se trunca**: envuelve. Es el encabezado de página de los arquetipos dashboard, lista y ajustes. |
| `FilterToolbar` | Fila que envuelve con la búsqueda/filtros (objetos de la librería: `SearchField`, `Select`, `SegmentedField`, `ListGridToggle`) y un contador `tabular-nums` al extremo. |
| `ListGrid` + `ListRow` + `Column` | Encabezado de columnas y filas comparten **una sola** plantilla (`template` con `grid-cols-[…]`, `gap-x-2`); la lista conserva columnas en mobile y scrollea en silencio (`.silent-scroll`); una celda sin dato reserva su lugar y nada se corta con elipsis. |
| `ListActions` + `pinnedActions` | Columna de acciones **fija** al borde derecho del scroll silencioso (patrón de tablas densas, ronda 14): las acciones nunca quedan fuera del alcance. La última celda de cada fila va en `ListActions` y el `ListGrid` lleva `pinnedActions`; el encabezado se fija con la misma pista. Fondo con `--list-actions-bg` (canvas por defecto; panel → superficie del panel). |
| `EmptyBlock` | `EmptyState` de la librería sobre la superficie v2, con `role="status"`. Nunca inventa datos ni métricas. |
| `EmptyCta` | CTA canónico de un estado vacío: botón primario con label contextual. Es la llamada a la acción que recibe `EmptyBlock.action`. |
| `ErrorBlock` | `ErrorState` de la librería con reintento, con `role="alert"`. |
| `LoadingBlock` | `Skeleton` con `role="status"` y `aria-busy`; reemplaza los “Cargando…” sueltos de las páginas nuevas. |
| `SectionLoading` | Fallback de una sección lazy (`next/dynamic`): el esqueleto de `LoadingBlock` sobre el panel del sistema, para que la transición muestre progreso en vez de pantalla en blanco mientras baja el chunk. |
| `Kpi`/`KpiStrip`, `StateChip` | Ya descriptos arriba: un solo KPI y un solo chip. |

### Tablas densas responsive — estrategia común (ronda 14)

Alcance: toda lista de registros con `ListGrid`. El contrato de fila no cambia
(fila finita, una plantilla compartida, montos/fechas/códigos `nowrap`); lo que
se fija es cómo responden cuando el ancho no alcanza. **Clientes y Presupuestos
la adoptan primero (COM)**.

1. **Columna de acciones fija (default).** La última celda de cada fila se
   envuelve en `ListActions` y el `ListGrid` lleva `pinnedActions`: la columna
   queda pegada al borde derecho del scroll silencioso, con un hairline que la
   separa, y el resto de las columnas se desliza por debajo. El encabezado de
   acciones se fija con la misma pista (`.list-actions-head`) para no
   desalinearse. El fondo de la columna sale de `--list-actions-bg` (canvas por
   defecto; una lista dentro de un panel declara la superficie del panel).
2. **Menú `⋯` (excepción, no default).** Si una fila necesita más de tres
   acciones de ícono más una de texto, las secundarias pasan a un menú de tres
   puntos con las mismas etiquetas y targets. No se implementa hasta que la
   primera pantalla lo necesite: no se crean componentes muertos.
3. **Vista tarjeta en anchos medios.** Cada pantalla declara el ancho de su
   plantilla (`minWidthClass`). Cuando el ancho de contenido no alcanza para esa
   plantilla, la vista por defecto es la **cuadrícula de tarjetas** (misma
   información, contrato de tarjeta ≥200 px) y el `ViewSwitch` permite volver a
   la fila. El corte se decide por plantilla, no por un breakpoint global:
   - Clientes (`min-w-[71rem]`): tarjeta por defecto por debajo de ~1190 px de
     contenido (≈1280 px de ventana con el riel expandido).
   - Presupuestos (`min-w-[90rem]`): tarjeta por defecto por debajo de ~1480 px
     de contenido (≈1670 px de ventana). COM agrega la vista tarjeta.
4. **Nada se corta para “entrar”.** Los montos, fechas y seriales siguen
   `nowrap` + `tabular-nums` dentro del scroll; la lista no trunca datos. La
   señal de que hay más columnas es el hairline de la columna fija y el recorte
   visible de la última columna scrolleada.

### CTA primario (ronda 14)

- Un solo botón primario en toda la app: `.primary` toma el fondo de
  `--interactive` y el texto de `--c-onbrand` (blanco sobre el violeta oscuro
  del tema claro; tinta oscura sobre el violeta claro del oscuro). Ratios
  medidos: **14.07:1** en claro y **5.30:1** en oscuro (hover 10.66:1 y 7.07:1),
  AA en ambos temas. El blanco sobre el violeta claro del oscuro daría 3.36:1:
  por eso el token, no un color fijo por pantalla.
- Ninguna pantalla declara el color del texto de un `.primary`: sale del token.

### Estados vacíos con CTA contextual (ronda 14)

- Un bloque sin datos se dibuja con `EmptyBlock`. Si el rol puede crear o cargar
  el dato, lleva `action={<EmptyCta label="…" onClick={…}/>}` y el label nombra
  la acción concreta, no un “Crear” genérico: “Registrar primera cuenta”
  (FIN), “Cargar plan del cliente” (COM), “Agregar valor de inventario” (OPS),
  “Nuevo presupuesto” (COM).
- Una celda suelta sin dato sigue mostrando `—` (dato honesto); el CTA vive en
  el estado del bloque que agrupa el vacío, no en la celda.
- El vacío nunca es mudo cuando el rol puede resolverlo; y nunca ofrece una
  acción que el rol no puede ejecutar (gate de rol primero).

### Estado de cobro de un cliente (única definición)

El **`payment_status` que devuelve el API** (`/client-payment-status`,
`/productivity/clients/:id`) es la única fuente del estado de cobro: la
pantalla no re-deriva con umbrales propios sobre `days_overdue`. El idioma de
la UI es uno solo:

| `payment_status` | Etiqueta | Tono del chip |
| --- | --- | --- |
| `up_to_date` | `Al día` | `ok` |
| `due_soon` | `Vence {next_due_on}` (si falta, `próximamente`) | `warn` |
| `late` | `{days_overdue} días de mora` | `warn` |
| `severe` | `{days_overdue} días de mora` | `bad` |

`days_overdue` se usa **sólo** para el número de días y para el orden/aging de
la vista de Mora (bucket propio de esa pantalla), nunca para decidir el tono:
eso lo decide el servidor (así Clientes, Mora y la ficha de una pieza no
pueden discrepar). Cuando una pantalla lo adopte, el par
`paymentStatusLabel/paymentStatusTone` se agrega a un módulo compartido
(`app/client-format.ts`) y se importa desde ahí.

### Arquetipos

| Arquetipo | Jerarquía | Cabecera y acciones | Densidad y mobile |
| --- | --- | --- | --- |
| **Dashboard / resumen** | Señales accionables arriba; KPIs; detalle financiero u operativo debajo. | Título de sección en el shell; acciones de contexto en la cabecera del panel. | KPIs en grilla 2/4 columnas; una columna a 360 px; nada de elipsis en cifras. |
| **Lista + detalle** | KPIs → barra de lote → encabezado de columnas → filas finitas; el detalle abre en ficha lateral. | Buscador, filtro y vista en la cabecera; alta a la derecha. | Fila 44–52 px con scroll horizontal silencioso; cuadrícula con tarjetas ≥200 px; el detalle es `Drawer` en móvil. |
| **Formulario / editor** | Secciones con título; campos por tipo con su ancho; acciones al pie. | Un solo primario de guardado; cancelar dentro de ventanas. | Una columna a 360 px; controles de 44 px; ayudas y errores bajo el campo. |
| **Tablero** | Columnas por estado con conteo y total; tarjetas con identidad y hechos. | Filtros del tablero en la cabecera; sin alta duplicada. | Scroll horizontal intencional; no se declara lista. |
| **Ajustes / configuración** | Dos columnas (principal + lateral) con tarjetas por tema; zona destructiva al final, separada. | Título por tarjeta; guardado por formulario. | Una columna a ≤1000 px; la zona destructiva conserva su confirmación tipada. |
| **Cuenta / acceso** | Un solo foco: identidad → verificación → contraseña. | Un primario por paso; enlaces secundarios discretos. | Tarjeta centrada, sin scroll horizontal; errores inline `role="alert"`. |

### Reglas de deuda (se corrigen en toda pantalla que se toque)

1. **Prohibido cortar con elipsis** montos, fechas, códigos, seriales o nombres.
   Se usa el ancho necesario, `nowrap` + `tabular-nums` para cifras y el ajuste
   de línea para textos; nunca `text-overflow: ellipsis` sobre esos datos.
2. **Una sola fuente de fechas y horas**: `list-format` (`listDateShort`,
   `listDateFull`, `dueTone`) dentro y fuera de listas; 24 h y zona Asunción.
   Prohibido `toLocaleString`/`toLocaleDateString` sueltos.
3. **Un solo KPI**: `Kpi`/`KpiStrip` de `app/ui-v2.tsx` (o `Stat` de la
   librería). No se crean `.metric`, `.kpi-card` ni `.financial-stat` nuevos.
4. **Un chip base**: `StateChip` (o `Badge`) con tono semántico; no se agregan
   chips por pantalla ni variantes paralelas.
5. **Anchos de campo por tipo** fuera del `Editor`: moneda 9–11 rem, fecha ~9,
   hora ~7, número/porcentaje ~7, texto corto 12–16, notas a ancho completo.
   Se aplican con clases Tailwind (`w-36`, `w-44`, `w-full`), no con CSS nuevo.
6. **Listas con encabezado y plantilla compartida**: el encabezado vive dentro
   del contenedor de la lista y comparte la plantilla de columnas con las filas
   (una sola constante en el módulo, `gap-x-2`); si una celda no tiene dato,
   reserva su lugar. Cuadrícula = tarjetas ≥200 px distribuidas.
7. **Estados en toda página**: vacío (`EmptyState`), carga (`Skeleton`/
   `LoadingBlock`) y error con reintento (`ErrorState`) con datos reales.
8. **Sin hojas CSS nuevas**: lo que no cubra Tailwind o la librería se agrega a
   `app/tailwind.css` (sistema) o se corrige en el objeto compartido.

### Migración

- La descomposición del shell (`scale-workspace.tsx`) la ejecuta **SOS-PLT
  (#47)**; las 3 páginas de referencia (`Panel`, `Clientes`, `Configuración`) se
  construyen sobre esos módulos extraídos, reciben datos y callbacks del shell y
  no fetchean ni conocen permisos. Los dominios de fase 2 replican ese patrón y
  retiran su CSS plano al rediseñarse.
- Ningún dominio toca el shell salvo la extracción de su módulo; los objetos
  compartidos se corrigen una vez y se adoptan en todos lados.
