# #241 — Auditoría local de tokens, estilos y layout

Fecha: 17 de octubre de 2026. Fuente reproducible: `11a71500df5063adfff92b6c21855b07a897226e`, Scale `1.0.190`. Issue: https://github.com/dariodeoli/scale-os/issues/241.

## Alcance y estado

Esta entrega corresponde a la fase 1 de `docs/PROMPT-BIBLIOTECA-OBJETOS.md`: inventario y propuesta, sin modificar producto. Se revisaron las **48 hojas CSS locales** de `app/` —44 en su raíz y cuatro en rutas—, sus imports, configuración Tailwind, contratos de diseño, `ui-v2` y `list-format`. El inventario JSX y de comportamiento por componente se entrega por separado por el responsable de esa auditoría; este documento aporta sus contratos visuales, consumidores de entrada y riesgos de cascada.

No se inspeccionó ni modificó el código externo de OwnCoding UI. El pin declarado en `package.json:41` es `v0.68.16`; se registra solamente para identificar la frontera actual. Tampoco se modificaron dependencias, backend, datos, versión ni deploy.

**Resultado:** ya existe una base canónica local aprovechable. La principal deuda es que convive con redefiniciones sucesivas y ajustes de pantalla del mismo objeto. Consolidar esas reglas requiere preservar sus contratos de foco, densidad, portales, formato monetario y permisos; reemplazar hojas completas o activar un reset global tendría alcance mayor que una unificación visual.

Las observaciones son de fuente estática. No constituyen una nueva certificación visual de todas las rutas. Las mediciones en navegador indicadas abajo son criterios para la fase de migración, no pruebas ya ejecutadas en este snapshot.

## Fuente de verdad y orden de aplicación

| Capa | Evidencia | Contrato actual / consumidores | Decisión propuesta |
| --- | --- | --- | --- |
| Fallback y paleta semántica | `app/globals.css:4`, `:153`, `:181` | Variables legacy, segunda familia semántica y tema oscuro; body, auth, portal y shell | Mantener una definición por rol y tema, con aliases compatibles durante la migración. |
| Geometría operativa | `app/ui-system.css:8`, `:18`, `:19`, `:385` | Espacios 4/8/12/16/20/24; controles, paneles, cards y superficies | Propietario único de métricas operativas. Separar definición de tokens de reglas de componentes antes de retirar duplicados. |
| Tema de contraste | `app/contrast.css:8` | Sobrescribe familias legacy y RGB `--c-*`; tercer tema real | Mantenerlo al mismo nivel que claro/oscuro, incluyendo cualquier token nuevo. |
| Puente RGB y utilidades | `app/tailwind.css:211`, `tailwind.config.mjs:15` | Duplicación explícita de los colores semánticos en canales RGB para clases existentes | Un solo mapa local de valores por tema; conservar formato RGB requerido por consumidores. No interpolar HEX donde se esperan canales. |
| Base de utilidades | `tailwind.config.mjs:27`, `:28`; `app/tailwind.css:33` | Dark por selector, preflight desactivado, reset acotado de bordes/botones | Mantener ese contrato. Habilitar preflight global no es parte de retirar duplicaciones. |
| Estilos de módulo | Inventario completo al final | Shell, rutas y componentes importan hojas propias | Deben conservar layout de negocio y valores dinámicos; geometría y estados genéricos migran a objetos canónicos. |

El orden explícito del layout es dependencia existente → `globals` → `qa-fixes` → `mobile-forms` → `ui-system` → `contrast` → `tailwind` (`app/layout.tsx:1`). `globals` importa fuentes y footer (`:1–2`). Los estilos de componente/ruta tienen entradas adicionales: no se puede deducir el estilo computado mirando solamente la última regla de `globals`, ni asumir que toda hoja de módulo gana a una regla scopeada más específica.

`html[data-theme]` y el script inicial (`app/layout.tsx:14`, `app/theme-toggle.tsx:10`) son el contrato de selección de tema. El arranque sin preferencia puede adoptar alto contraste; no adopta automáticamente oscuro según el sistema. La excepción de dataviz se analiza en T09.

## Inventario de diferencias y canon propuesto

Prioridad **A**: riesgo concreto que debe verificarse antes de propagar el canon. **B**: duplicación o diferencia a consolidar por lotes. **C**: documentación o candidato sin consumo demostrado. No son fallos visuales certificados sin medición.

| ID / prioridad | Objeto, ubicación y consumidores | Duplicación o diferencia observada | Canon local y migración propuesta | Riesgo que debe cubrirse |
| --- | --- | --- | --- | --- |
| T01 / B | Colores: `globals.css:4`, `:153`, `:181`; `tailwind.css:213`; `contrast.css:8`. Todo el marco | Paleta HEX, aliases semánticos y valores RGB repetidos manualmente. Un cambio de marca/estado tiene varios destinos | Tabla única de roles por tema que produzca los formatos actuales. Retener aliases legacy hasta terminar consumidores | No equiparar texto sobre marca con texto de marca, ni color de estado con texto sobre su relleno. Los tokens `--c-onbrand`, `--c-*-text` tienen funciones distintas. |
| T02 / B | Botones: `globals.css:5`, `:166`; `qa-fixes.css:23`, `:28`; `ui-system.css:203`, `:397`; `operations.css:209`. Editor, toolbars y filas | Padding, peso, sombra, radio y foco repartidos. Base radio 8; shell termina con radio 10. `.secondary` recibe dos pases en qa-fixes | Un objeto base con variantes primary/secondary/ghost/danger, tamaño operativo y acción de fila. Mantener clases puente mientras se migran consumidores | Los botones de formularios, links y acciones compactas no comparten necesariamente tipo HTML ni navegación. No cambiar permisos ni semántica de submit. |
| T03 / A | Alturas y breakpoints: `ui-system.css:18`, `:158`, `:181`, `:322`; `search-field.css:9`; `theme-toggle.css:3`; `finance-balance.css:21` | Control base 40, móvil 44 a ≤760; búsqueda móvil 48; acciones de fila cambian a 768; otras acciones a 767. Existen alturas locales 38 (`operations.css:209`) y 42 (`reports-workspace.css:2`, sin import activo identificado) | Tabla explícita de tamaños: control normal, búsqueda, acción de fila y target táctil. Resolver deliberadamente banda 761–767. Container queries para ancho del formulario | No reducir targets táctiles por elegir una altura compacta. Verificar puntero coarse además de ancho de viewport. |
| T04 / B | Inputs: `globals.css:5`, `:164`; `ui-system.css:239`, `:373`; `operations.css:209`; `mobile-forms.css:12` | Borde, radio, fuente y foco repetidos. Exclusiones de checkbox/radio/search y padding reservado para controles con iconos son funcionales | Mantener Editor/campos canónicos; concentrar geometría y estados del control, y documentar exclusiones. Mantener `data-oc-control` padding reservado (`ui-system.css:246`) | Evitar doble borde del buscador, iconos sobre texto, checkbox estirado, zoom iOS o pérdida de foco al validar. No trasladar validación comercial a CSS. |
| T05 / B | Búsqueda: `search-field.css:1`; import `search-field.tsx:5`; exclusiones en `ui-system.css:239` | Es un compuesto con borde/foco exteriores, no un input nativo con icono añadido. Usa transición literal 160ms y aliases opcionales | SearchField conserva anatomía y adopta tokens de duración/tamaño; no reintroducir reset de borde en su input | Ring visible en `focus-within`, clear y teclado; placeholder y texto no deben quedar debajo del icono. |
| T06 / B | Radios y sombras: `ui-system.css:32`, `:349`, `:388`, `:392`, `:496`; `operations.css:13`, `:208`; `finance-balance.css:1`, `:17` | Panel/card reciben varias capas de sombras y radios. `--radius-sm/md/lg` y `--ui-radius-control/card` coexisten; tarjetas locales usan 12 literal | Elegir roles control/card/dialog/pill y mapear nombres legacy a ellos; una regla de sombra por superficie/estado | No sustituir 999px/50% por radio de card. Evitar convertir preview/documento o drawer en card operativa. |
| T07 / B | Cabecera/filtros: `ui-system.css:47`, `:60`; `ui-v2.tsx:454`, `:516`, `:540`; `qa-fixes.css:9` | Existe PageHeader/ListPage/FilterToolbar, pero filtros de producción mantienen gap16 y margen20 en hoja global de correcciones | Mantener canon PageHeader→toolbar→KPI→contenido; retirar ajustes globales de dominio sólo al migrar su consumidor | No duplicar título/contexto al anidar sección; no ocultar acciones ni truncar información necesaria. Medir alto superior, no sólo padding. |
| T08 / A | Foco: `globals.css:163`; `ui-system.css:267`; `assignee-picker.css:23`; `team-access.css:6`; `photo-cropper.css:4`; `superadmin/platform-admin.css:29` | Anillos 2/3px y colores diferentes. Algunos usan halo translúcido como outline en lugar de token sólido. No toda ausencia de outline es fallo: `tailwind.css:173–178` lo repone en focus-visible | Un token sólido de foco más halo opcional, variantes inverse/interactive justificadas. Revisar override por especificidad y portal | Medir contraste con fondo real y recorte por overflow; probar teclado, focus-within y retorno de diálogo. No eliminar señales existentes antes de medir la sustitución. |
| T09 / A | Temas: `ui-system.css:386`, `:408`; `contrast.css:8`; `superadmin/usage.css:2–4` | El shell tiene gradiente inicial literal `#fcfbfd` y sólo override dark; contraste no redefine `--ui-shell-canvas`. Dataviz adopta oscuro por media query si no hay `data-theme=light`, aunque shell no tenga el mismo criterio | Completar roles de superficie para los tres temas y hacer explícita la política de tema de gráficos | Riesgo de inicio claro del shell con texto blanco de contraste. Dataviz puede tomar serie oscura sobre superficie clara o contrast. Confirmar estilo computado; no afirmar ratio sin medir. |
| T10 / B | Estados: `ui-v2.tsx:360`, `:385`, `:395`, `:417`, `:427`; `globals.css:10`; `company-settings.css:12`; `contracts-workspace.tsx:24` | Skeleton/carga/vacío/error canónicos conviven con `.error`, feedback/empty locales y textos de formulario. EmptyCompact 44–52 y EmptyBlock de panel tienen propósitos diferentes | Mantener wrappers existentes y una superficie por rol: estado de panel, vacío compacto y error de campo/formulario. Conservar contenido de negocio | No transformar fallo en vacío ni borrar datos cargados durante refresh. Mantener role=status/alert, reintento y foco de error; no anunciar esqueletos como contenido real. |
| T11 / B | Toast/éxito: `toast.css:1`, `:3`, `:6`; `notification-center.tsx:15`; formularios `.form-status` en `ui-system.css:265` | Toast ya tiene tokens locales de tono y reduced-motion, pero icono usa blanco fijo. Z-index10000 sin escala compartida | `notify()` + NotificationCenter sigue siendo canon de confirmación breve; tokens on-success/on-warning/on-danger para iconos, no un toast por pantalla | Validar icono sobre todos los tonos/temas. No convertir errores inline/login en toast ni alterar mensajes de negocio. |
| T12 / B | Chips: `ui-system.css:424`, `:430`; `client-directory.css:1`; `ui-v2.tsx:123`; `urgency.css:1` | Dos listas de aliases repiten cápsula genérica; módulos conservan colores/estados propios, además de StateChip | Canon visual StateChip con tonos; adaptadores de negocio deciden tono/etiqueta, no CSS global que infiera estado | Un requisito de factura no es emisión, mora no equivale a cancelación y ausencia de dato no equivale a estado negativo. Preservar texto y permisos. |
| T13 / B | Tablas/listas: `ui-v2.tsx:557`, `:597`; `ui-system.css:292`, `:376`; `list-format.css:1`; `finance-balance.css:13` | Tablas HTML y ListGrid tienen tipografías de encabezado 11 y 10; una plantilla compartida ya resuelve alineación. Algunas listas necesitan pistas monetarias dinámicas | Mantener ListGrid/ListRow/ListActions como canon de lista operativa; una plantilla por tabla y wrappers HTML para datos tabulares/documentales justificados | No esconder columnas en móvil ni aplicar elipsis a dinero/fechas/códigos. Acciones sticky deben conservar superficie, z-index y foco; scroll interno alcanzable con teclado. |
| T14 / B | Cards: `ui-v2.tsx:313`; `ui-system.css:486`; `project-card.css:1`; `contracts-workspace.css:1` | CompactCard coexiste con anatomía genérica por selectores de siete dominios y tarjetas locales. Contratos reserva min-height200; CompactCard declara alto por contenido | Definir card por composición: identidad, hechos, estado, progreso, acciones. Elegir cuándo filas iguales y cuándo alto natural, sin otra card de negocio | Evitar espacio vacío por mínimo arbitrario, cortar nombre/importe o hacer que toda card sea botón anidando acciones interactivas. |
| T15 / B | Identidad: `ui-system.css:83`; `client-identity.css:11`, `:19`; `person-container.css:1`; `actor-identity.css:1` | FotoPerfil centraliza círculo/object-fit, pero envoltorios ajustan dimensiones y gaps; ClientIdentity declara gap8 y después12, compact26 frente tamaños canónicos | Conservar FotoPerfil + PersonContainer/ClientIdentity/ActorIdentity como composición contextual; tamaño por prop/token, sin segundo recorte local | Foto cover vs logo contain, fallback sin URL, nombre largo y fuente real de imagen. No exponer datos personales ocultos por permisos al unificar secundarios. |
| T16 / B | Tabs: `ui-system.css:177`, `:192`; `ui-v2.tsx:497`; `employee-tasks.css:1` | Section-tabs, TabScroller y ViewTabs ya cubren navegación/selección; módulo tareas mantiene carril propio. Breakpoint760 y tamaño34→44 | Compartir carril horizontal y controles de desplazamiento; mantener variantes link de navegación vs cambio de vista | No convertir enlaces en tabs ARIA sin implementar su contrato de teclado, ni esconder pestañas sin mecanismo para alcanzarlas. |
| T17 / C | Aliases locales: `list-format.css:1` (`--mono`), `operations.css:23` (`--accent`), `contracts-workspace.css:1` (`--muted`); `employee-tasks.css:1` (`--color-*`) | No aparecen definiciones locales de los tres primeros en app/config inspeccionados. Otros nombres cuentan con fallback, p.ej. border-hover, text-placeholder, surface-soft, danger-600 | Inventariar contrato computado antes de mapear a fuente mono/text-muted/brand o eliminar. Fallbacks válidos no son por sí solos un fallo | No asumir ausencia total: una variable puede venir de dependencia o estilo dinámico. `--finance-amount-width` sí es dinámico y debe conservarse. |
| T18 / B | Movimiento: `ui-system.css:334`; `team-access.css:9`; `toast.css:9`; `cliente/portal.css:12` | Hay reducción de movimiento central y local, con excepciones. No es prueba de que toda animación externa quede cubierta | Duraciones y easing compartidos; reglas reduced-motion junto al objeto dueño, con alcance explícito | Scope de shell/dialog no incluye automáticamente todo el portal/body. No retirar protecciones locales antes de probar sus superficies. |

## Variantes que deben mantenerse explícitas

- **Auth**: `globals.css:18–40` define tokens propios y control de 48px, distinto del control operativo de 40px. Login, invitación y registro requieren teclado, contraseña, consentimiento y viewport con teclado virtual. Migrar al mismo objeto con variante de tamaño/superficie; no aplicar densidad de fila a acceso.
- **Superficies inversas**: sidebar `tailwind.css:94–124` usa blancos y fondos de marca deliberados. Son candidatos a roles inverse, no sustituciones mecánicas por texto/body.
- **Portal y páginas públicas**: `cliente/portal.css:1`, `blog.css:1`, `blog-templates.css:4` tienen layout editorial/entrada. Pueden compartir controles, foco y estados sin adoptar la misma cabecera ni columnas que un dashboard.
- **Datos visualizados**: `superadmin/usage.css:2` tiene paleta de series diferenciable, además de ejes y superficie semánticos. Los colores de categorías/series no equivalen a éxito/error comercial.
- **Preview/documento**: `suite.css:1` y `ui-system.css:303` reservan anatomía de documento y corrigen el scope de `aside`. No reintroducir reglas del sidebar en previews ni confundir preview con card.
- **Fotografía/crop**: `photo-cropper.css:1` y `qa-fixes.css:16` ajustan viewport de imagen y herramientas. Compartir overlay/foco donde corresponda, manteniendo zoom, recorte, proporciones y cierre independiente.

## Cobertura de estados y responsive

La revisión estática identifica contratos que deben permanecer en cada migración:

| Dimensión | Evidencia existente | Verificación requerida antes de retirar reglas |
| --- | --- | --- |
| Claro/oscuro/contraste | `globals.css:181`, `contrast.css:8`, `theme-toggle.tsx:10`, puente en `tailwind.css:213` | Estilo computado de canvas, panel, borde, texto, estado y foco; texto normal ≥4.5:1, elementos no textuales pertinentes ≥3:1. Medir cada fondo y estado real; especial atención T08/T09/T11. |
| Densidad y overflow | `ui-system.css:47`, `:322`, `finance-balance.css:3`, `:13` | 1440 y 390, ambos temas principales y contraste; además 760/761/767/768, tablet, zoom 200%, nombre largo y máximo monetario. Documento sin scroll horizontal; tablas con scroll local; importes completos dentro de card. |
| Formularios por contenedor | `ui-system.css:312` (560/900); `dialog.css:6` (540); `operations.css:326` | Diálogo angosto en pantalla ancha, bottom sheet con teclado virtual, validación visible sin remount/foco perdido, conservar borrador al abrir hijo/cancelar/error. |
| Foco/teclado | `ui-system.css:267`, `tailwind.css:176`; `ui-v2.tsx:559`; `dialog.css:4` | Tab/ShiftTab, retorno al disparador, scroll de lista por teclado, foco dentro de portales y diálogo superior. `outline:0` de cuerpo de diálogo no certifica por sí solo controles sin foco. |
| Loading | `ui-v2.tsx:216`, `:267`, `:360` | Skeleton conserva pistas del contenido y role/status busy; datos desconocidos no se convierten en cero; no desplaza filtros ni bloquea todo el módulo por refrescar una sección. |
| Vacío y error | `ui-v2.tsx:395`, `:417`, `:427`; `ui-system.css:265` | Vacío inicial, filtro sin resultados, error de carga con reintento y error de guardado conservando datos son estados diferentes. No bajar accesibilidad al compartir apariencia. |
| Éxito y disabled | `toast.css:3`; `ui-system.css:226`, `:251`; `notification-center.tsx:15` | Confirmación anunciada, busy/single-flight, razón de indisponibilidad cuando corresponde; no depender exclusivamente de opacidad/color para informar estado. |
| Movimiento reducido | `ui-system.css:334`, `toast.css:9`, `cliente/portal.css:12` | Revisar las superficies fuera del scope central, transiciones y animaciones; conservar contenido sin movimiento decorativo. |

Hay **33 declaraciones** de media query exactamente equivalentes a `max-width:760px`, **10** a `max-width:767px` y **9** a `min-width:768px`, normalizando espacios y excluyendo comentarios. Son declaraciones, no cantidad de pantallas ni un conteo de defectos. El contraste entre esos umbrales justifica una matriz de bordes; no implica que cada breakpoint particular deba desaparecer. Los queries de contenedor 560/900 y el sheet 540 tienen intención distinta.

## Inventario completo de hojas locales

Las referencias de consumidor son las entradas de import, no una lista exhaustiva de instancias JSX. Eliminar una hoja requiere comprobar también imports indirectos, clases construidas y tests. Las hojas minificadas concentran numerosos selectores en una línea; una referencia `:1` puede abarcar varios objetos.

| Hoja / evidencia inicial | Consumidor de entrada | Papel y seguimiento |
| --- | --- | --- |
| `app/globals.css:1` | `app/layout.tsx:2` | Base, temas, auth y legacy global. T01–T04, T08. |
| `app/fonts.css:1` | `app/globals.css:1` | Fuentes self-hosted. Mantener métricas y carga, no duplicar familias. |
| `app/ui-system.css:8` | `app/layout.tsx:5` | Métricas y objetos scopeados; principal canon visual. |
| `app/tailwind.css:22` | `app/layout.tsx:7` | Utilidades, resets locales, puente RGB y superficies inversas. |
| `app/contrast.css:8` | `app/layout.tsx:6` | Tercer tema; completar nuevos roles. |
| `app/qa-fixes.css:3` | `app/layout.tsx:3` | Correcciones globales de dominios, botones y foto. Migrar por objeto, no borrar como bloque. |
| `app/mobile-forms.css:2` | `app/layout.tsx:4` | Móvil/auth/dialog; solapa controles y targets centrales. |
| `app/workspace-footer.css:1` | `app/globals.css:2` | Variantes footer shell/auth. Mantener fronteras de superficie. |
| `app/operations.css:1` | `app/scale-workspace.tsx:51` | Cards, formularios y ajustes legacy. T02/T04/T06. |
| `app/control-center.css:1` | `app/scale-workspace.tsx:46` | Shell, paneles, KPIs y módulos. Comparar scope y densidad central. |
| `app/client-directory.css:1` | `app/scale-workspace.tsx:18` | Estados, listas/cards de clientes/proyectos/equipo. T12–T15. |
| `app/settings-slice.css:1` | `app/scale-workspace.tsx:104`, `app/suite.tsx:30` | Paneles/configuración y peligro; preservar estado/acciones. |
| `app/suite.css:1` | `app/scale-workspace.tsx:52` | Presupuesto, composer y preview. Variante documental. |
| `app/dialog.css:3` | `app/dialog.tsx:7` | Overlay/dialog/drawer/sheet, cuerpo/footer y safe area. Dueño de su geometría. |
| `app/search-field.css:1` | `app/search-field.tsx:5` | Buscador compuesto; borde exterior. T05. |
| `app/list-format.css:1` | `app/list-format.tsx:8` | Serial, importe, fecha e identidad de lista. T13/T17. |
| `app/person-container.css:1` | `app/person-container.tsx:4` | Composición persona y secundarios. T15. |
| `app/actor-identity.css:1` | `app/actor-identity.tsx:4` | Autor/tiempo/fuente; mantener procedencia. |
| `app/client-identity.css:4` | `app/client-identity.tsx:14` | Paletas de identidad, logo y footer personal. T15. |
| `app/assigned-people.css:1` | `app/assigned-people.tsx:3` | Agrupación de personas; compartir tamaños/gaps. |
| `app/assignee-picker.css:1` | `app/assignee-picker.tsx:5` | Selección/asignación con chips, targets y foco. T08/T15. |
| `app/entity-picker.css:1` | `app/entity-picker.tsx:14` | Opciones y textos de selector genérico. Conservar elegido/loading/vacío. |
| `app/team-access.css:1` | `app/team-access.tsx:8` | Estado y acciones de acceso, layout/foco. T08; no convertir permisos en estilo. |
| `app/project-card.css:1` | `app/project-card.tsx:21` | Anatomía de card de proyecto. Comparar composición CompactCard. |
| `app/productivity.css:1` | `app/productivity-ui.tsx:21`, `app/work-history.tsx:10` | Detalle/drawer/resúmenes. Comparar reglas comunes del drawer. |
| `app/contracts-workspace.css:1` | `app/contracts-workspace.tsx:8` | Cards, fuentes, revisión y preview contractual. T10/T14/T17. |
| `app/finance-balance.css:1` | `app/finance-balance.tsx:16`, `app/finance-collections.tsx:13`, `app/finance-history.tsx:9` | Cards, pistas dinámicas de tablas y cronología compartida. No asumir que sólo carga desde Balance. |
| `app/reports-workspace.css:2` | Sin import directo encontrado en `app/` | Candidato legacy, no consumo efectivo acreditado en este snapshot. No activar ni eliminar sin revisar histórico y harness. |
| `app/company-settings.css:1` | `app/company-settings.tsx:8` | Empresa, resumen, feedback/empty. T10/T17. |
| `app/company-legal-profile.css:1` | `app/company-legal-profile.tsx:6` | Layout/acciones del perfil legal; no cambiar validación del modelo. |
| `app/employee-tasks.css:1` | `app/employee-tasks.tsx:9` | Filtros, cards, tabs y detalle de tareas; aliases de color con fallback. |
| `app/work-checklist.css:1` | `app/work-checklist.tsx:8` | Checklist, progreso, fechas/acciones. Conservar estado operativo y foco. |
| `app/commenting.css:1` | `app/commenting.tsx:7` | Composer, menciones y comentarios. Comparar estilos de menciones repetidos en `operations.css:141`. |
| `app/drive-links.css:1` | `app/drive-links.tsx:5` | Chips/enlaces/acciones; separar URL de presentación. |
| `app/due-date.css:1` | `app/due-date.tsx:4` | Vencimiento/estado/variante compacta; preservar semántica de fecha. |
| `app/urgency.css:1` | `app/urgency.tsx:5` | Selector/badge de urgencia; tono de negocio separado del objeto. |
| `app/presence.css:1` | `app/presence.tsx:6` | Presencia, personas y panel de uso; tamaños compartidos, significado propio. |
| `app/live-visitors.css:1` | `app/live-visitors.tsx:3` | Resumen y sitios/visitantes; mismos patrones panel/estado. |
| `app/photo-cropper.css:1` | `app/photo-cropper.tsx:6`, `app/profile-photo.tsx:8`, `app/photo-viewer.tsx:7` | Crop/zoom/foto; superficie especializada. T08. |
| `app/toast.css:1` | `app/notification-center.tsx:6` | Feedback portal en body, capa y tonos. T11. |
| `app/theme-toggle.css:1` | `app/theme-toggle.tsx:4` | Control de tema y posición auth; breakpoint767 vs760. |
| `app/manual.css:1` | `app/manual.tsx:3` | Details/summary y contenido de ayuda; mantener teclado. |
| `app/blog.css:1` | `app/blog/layout.tsx:7` | Superficie editorial pública, no dashboard. |
| `app/blog-templates.css:4` | `app/blog-templates.tsx:5` | Variantes editoriales y foco; preservar scoping. |
| `app/cliente/portal.css:1` | `app/cliente/layout.tsx:3`, páginas de acceso/entregas | Portal/consentimiento/auth y errores. Variante con controles de 46px, no reset a tabla compacta. |
| `app/superadmin/platform-admin.css:9` | `app/superadmin/page.tsx:13` | Panel global usa shell y añade layout/foco. T08. |
| `app/superadmin/usage.css:2` | `app/superadmin/usage.tsx:16`, `usage-charts.tsx:6`, `traffic.tsx:15` | Dataviz, tooltip, leyenda y tabla alternativa. T09. |
| `app/superadmin/traffic.css:1` | `app/superadmin/traffic.tsx:16` | Variante de métricas/tráfico. Consolidar superficie, mantener dominio. |

## Documentación y cobertura que necesitan reconciliación

1. `AGENTS.md:129` exige encabezados y plantilla compartida, columnas conservadas y dinero completo; `DESIGN-SYSTEM.md:55` conserva una descripción antigua de colapso de inventario a una columna. El contrato actual de `ListGrid` (`ui-v2.tsx:547`) es scroll interno sin colapsar celdas. Actualizar esa referencia antes de usarla como criterio de migración.
2. `DESIGN-SYSTEM.md:149` cita un tag antiguo y `tailwind.config.mjs:8` habla de 53 hojas legacy. El snapshot inspeccionado declara pin 0.68.16 y 48 hojas locales; esos comentarios no describen el inventario actual.
3. `DESIGN-SYSTEM.md:150` plantea evitar CSS nuevo por componente, mientras hay hojas activas dedicadas a primitivas y cronología compartida. Acordar si se prohíbe duplicación de objetos o cualquier archivo nuevo; son restricciones diferentes. Propuesta: dueño único por objeto y tokens, sin prohibir separar su hoja por responsabilidad.
4. Ya hay guardas útiles: `tests/css-comments.test.ts`, `tests/contrast-theme.test.ts`, `tests/densidad-fin.test.ts`, `tests/com-responsive-tables.test.tsx`, `tests/fin-v2-contract.test.ts`, `tests/dialog-interactions.test.tsx`. Las aserciones de fuente/renderer no sustituyen geometría, estilo computado ni foco nativo. Conservar ambas coberturas al mover reglas; no ajustar regex para ocultar regresiones.

## Secuencia propuesta de migración, posterior a consolidar la auditoría

1. **Acordar inventario y fronteras** con la auditoría JSX. Elegir responsables y consumidores de cada objeto; distinguir variante necesaria de duplicación. No empezar por renombrar clases masivamente.
2. **Baseline visual local:** catálogo de superficies y estados, 1440/390, tres temas, teclado y textos/montos extremos. Verificar T08/T09/T11 antes de propagar su estilo base. Registrar capturas y medidas por SHA.
3. **Tokens compatibles:** mapa único de semántica/tema y roles de geometría, conservando aliases. Sin cambio de valores en este paso salvo fix independiente acreditado; comprobar estilos computados en portal, auth, superadmin y shell.
4. **Objetos de alta reutilización:** botones, controles, búsqueda, Dialog/Editor, foco y estados. Una implementación canónica local por tipo y variantes tipadas, manteniendo callbacks/refs/ARIA y reglas comerciales en consumidores.
5. **Contenedores:** PageHeader/FilterToolbar, cards por composición, tabs con carril común y tablas con una plantilla. Migración por dominio para permitir revisión y rollback; no añadir CSS global con una lista creciente de clases de negocio como sustituto de composición.
6. **Retirar aliases/reglas duplicadas sólo con cero consumidores acreditados**, incluidas clases dinámicas, rutas lazy, portales y harness. Revisar hoja candidata de reportes separadamente. Actualizar guía y catálogo al mismo tiempo.
7. **Fases siguientes del prompt:** catálogo completo y evaluación/publicación externa únicamente después de unificar localmente. Esta auditoría no adelanta esa comparación ni propone una dependencia nueva.

Criterios de aceptación por lote: mismos datos/callbacks/permisos; draft y errores conservados; teclado/foco/restauración correctos; busy y una sola escritura; dinero/fecha/código sin truncar; filas/encabezados alineados; targets móviles pertinentes; tres temas sin pérdida de contraste; cero overflow de documento; estados distinguibles y anunciados; pruebas focales y evidencia visual del SHA. El integrador ejecutará lint/typecheck/build y suites de integración según alcance antes de merge/deploy, sin afirmar validación física o remota que no se realizó.

## Evidencia de esta entrega

- Lectura del issue #241 y del prompt local, AGENTS y guía de diseño; enumeración recursiva con `rg --files app -g '*.css'` y comprobación de imports locales.
- Revisión estática de las 48 hojas, roles/tokens, selectores de tema/foco/estado y queries; conteo de media queries excluyendo comentarios para evitar contar el texto `@media 540` del comentario de Dialog.
- Sólo documentación modificada. No se ejecutaron suites globales, build ni navegador adicional para este documento; la campaña 191 mantiene sus gates y QA independientes. Los checks de enlaces/rutas y diff documental se realizan al entregar.
- Pendiente de fase consolidada: cruzar todos los consumidores JSX, confirmar estilos computados de los riesgos señalados y aprobar lotes de migración. No hay cambio de producción ni deploy en esta entrega.
