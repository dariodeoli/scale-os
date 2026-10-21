# #241 — Migración aplicada de acciones y excepciones estructurales

Fecha: 17/10/2026. Baseline de aplicación: `1cc44010`; snapshot final revisado: `99e7f5c6`. Sólo fuentes locales de Scale; sin inspeccionar fuentes externas de OwnCoding, cambiar negocio, versión, main ni deploy.

## Resultado comprobado

El snapshot tenía **629 sitios JSX**: 515 botones nativos (incluido renderer), 77 usos Button importados, 23 IconAction importados y 14 acciones locales existentes. La aplicación AST modifica **109 archivos** y migra **557 sitios** (457 acciones nativas + 77 Button + 23 IconAction). El inventario al completar esa aplicación conservó **629 sitios: 571 canónicos, 57 excepciones estructurales revisadas y 1 renderer nativo de Button**. **Manual = 0; UNREVIEWED = 0.** Los widgets retenidos siguen usando elementos nativos y no equivalen a consolidación estructural ya implementada.

- [Historial de decisiones antes de aplicar](241-ui-actions-migration-reviewed.json): 167 revisiones explícitas, con hashes de archivo/JSX; 87 acciones, 23 fachadas y 57 excepciones. Las otras 447 migraciones ya eran inequívocas por la API o las clases existentes.
- [Reporte exhaustivo de aplicación](241-ui-actions-applied.json): todos los paths seleccionados explícitamente, hashes previos y clasificación por sitio.
- [Manifiesto vigente](241-ui-actions-reviewed.json): sólo los 55 nativos retenidos, con posiciones y hashes finales; el audit se ejecuta contra este archivo.
- [Reporte exhaustivo final](241-ui-actions-final.json): todos los hashes de fuente y sitios finales, incluidos los alias de IconAction local, reconocidos como canónicos.

De las 169 decisiones anteriores, 143 conservaban JSX y hash exactos. Se revisaron 24 sitios de nuevo: duplicados por layout, cambios pending/dirty, asa con disabled después de spreads, handlers de cupón con single-flight y opciones RHF con shouldDirty. Cuatro renderers viejos (dos EntityPicker y dos PlainSelect) ya habían desaparecido del producto al compartir Selector; su sustitución tiene dos sitios nativos (trigger y optionNode), ahora documentados. No se aceptó el manifiesto antiguo cambiando hashes a ciegas.

## Refresh posterior a catálogo, Balance y encabezado

El [registro explícito del refresh](241-ui-actions-refresh.json) revisa diez fuentes TSX nuevas/modificadas entre el audit de aplicación y `0afdbd08`: catálogo/ruta, daily-controls, Dialog, Balance/clientes/equipo, reporte, shell y DialogFormState. No se modificó producto para acomodar hashes. Las **55 excepciones restantes mantienen exactamente su JSX/hash anterior**. Se retiran del manifiesto únicamente ReportProblemButton nativo y logout del sidebar, reemplazados por Button/IconButton del encabezado en #245. El historial de 167 decisiones y el reporte de aplicación permanecen intactos.

Se añaden **17 sitios canónicos revisados**: 14 del catálogo sintético (variantes/estados/formularios y diálogos locales), dos variantes del trigger de reporte y logout del encabezado. No hay nuevos botones nativos de acción. El nuevo inventario es **644 sitios JSX: 588 canónicos, 55 estructurales revisados, 1 renderer; manual=0 y UNREVIEWED=0**, sobre **211 TSX**. El catálogo importa Button/IconButton por exports nombrados de `../ui`. La herramienta reconoce ese entry y `../ui/index` por ruta local y símbolo exactos; los alias de esos símbolos conservan identidad. Fixtures negativos excluyen módulos parecidos, exports distintos renombrados Button y variables locales.

El test concilia los deltas contra la aplicación histórica y las nuevas posiciones de acciones; comprueba retiros, motivos, unicidad, hashes finales reales e idempotencia. La comprobación de arquitectura valida los límites/exportaciones del barrel por separado. No se exige igualar artificialmente el conteo de la migración original a una app que incorporó un catálogo.

## Refresh de release con el paquete numérico publicado

Snapshot `99e7f5c6`, posterior al primer refresh `0afdbd08`. Se revisaron ocho TSX modificados: `finance-clients`, `finance-collections`, `finance-personnel`, `inventory-workspace`, `project-card`, `sections/clientes`, `ui/input` y `ui/number`. Los cambios de finanzas/KPI/pie son de composición; Inventario limita los cuadrados a IconButton/trigger de menú. **Los 55 widgets conservan exactamente su JSX/hash previo; no se añadieron ni retiraron sitios de acción.** CSS de Button/encabezado/logos se acredita en sus QA; no produce hashes TSX adicionales en esta auditoría.

`app/ui/input.tsx` y `number.tsx` son fachadas de exports nombrados del paquete publicado **OwnCoding 0.68.17**: renderers en `owncoding-ui/numeric`, reglas puras en `owncoding-ui/number-utils`. No contienen renderers nativos ni lógica duplicada. La prueba de arquitectura verifica símbolos y subpaths exactos; no se amplió una excepción genérica. El typecheck de esta revisión usa esa dependencia instalada realmente en el worktree privado del integrador, sin modificarla.

El inventario final permanece en **644 sitios: 588 canónicos, 55 estructurales revisados y 1 renderer, con cero UNREVIEWED**, sobre 211 TSX. `241-ui-actions-refresh.json` conserva la revisión anterior bajo `reviewHistory` y documenta estos ocho diffs en `latestReview`; los motivos/hashes acumulados corresponden a las fuentes finales. Los 167 registros originales y el reporte de aplicación no se modificaron. Auditoría repetida coincide byte a byte con `241-ui-actions-final.json`.

Verificación de cierre: **20 fixtures de herramienta + 8 fixtures de arquitectura PASS**, architecture de 318 módulos PASS, TypeScript con OwnCoding 0.68.17 PASS y diff-check PASS. Sin cambios de producto, versión, main ni deploy en esta entrega.

## Compatibilidad y límites

`text-button danger` conserva acción transparente mediante `ghost` + `danger`; `secondary danger` conserva borde mediante `outline` + `danger`. Las variantes dinámicas sólo leen condiciones puras revisadas. Se mantienen className, comments, refs, form/value/name, eventos, aria/data, tipo omitido y children directos. Los props icon/label existentes se evalúan una vez; no se ejecutan callbacks durante render. Las importaciones con alias conservan su nombre local.

IconAction pasa a la fachada local sobre IconButton. Vocabulario local revisado: check/clock/close/edit/eye/package/refresh/sliders/trash; tonos fono/ok/warn/bad y tipo button explícito, sin adivinar iconos. El submit real del login elige explícitamente `size="large"`: **48px**. La forma rectangular y radio de 10px se mantienen. ProviderSignIn conserva su anatomía de marca como excepción identificada.

Las excepciones siguientes preservan composición de superficie, roles, selección, sensores, teclado o accesorios. Los destinos marcados propuesto son trabajo futuro de consolidación del presenter, no implementaciones acreditadas. No son permiso para introducir nuevas acciones nativas en esos módulos; un sitio nuevo o modificado invalida la revisión. La ficha de empresa/cliente, importes enteros de planes, salarios, fechas de pared y SSO siguen bajo sus esquemas, permisos y adaptadores existentes.

## Registro completo de excepciones

| Canon / propietario estructural | Sitios | Consumidores actuales | Motivo |
| --- | ---: | --- | --- |
| app/assignee-picker.tsx → SelectionBase/AssignedChip | 2 | `app/assignee-picker.tsx` | Control de principal/eliminación dentro del selector múltiple: chips y selección conservan límites, principal y targets; compartir engine de selección, sin tamaño de acción global. |
| app/commenting.tsx + app/comment-composer.tsx → MentionOption/SelectionBase | 2 | `app/comment-composer.tsx`, `app/commenting.tsx` | Opciones de menciones con role=option, aria-selected y onMouseDown que evita perder foco; el motor de selección puede compartir navegación, no el callback de negocio. |
| app/ui/surfaces/CardSurface.Action (propuesto; consumidores actuales conservados) | 15 | `app/control-center.tsx`, `app/inventory-workspace.tsx`, `app/production-board.tsx`, `app/productivity-ui.tsx`, `app/project-card.tsx`, `app/sections/clientes.tsx`, `app/sections/pipeline.tsx`, `app/superadmin/overview.tsx`, `app/ui-v2.tsx`, `app/workspace-guide.tsx` | Superficie completa de identidad/título/fila navegable, con layout de texto/imagen/estado y área flexible; no CTA con padding uniforme. Consolidar action-slot estructural de CardSurface, conservar children directos, foco y apertura en callback. |
| app/desktop-sidebar.tsx + mobile-navigation.tsx + superadmin/sidebar.tsx → NavigationAction | 5 | `app/desktop-sidebar.tsx`, `app/mobile-navigation.tsx`, `app/scale-workspace.tsx`, `app/superadmin/sidebar.tsx` | Anatomía del rail/sidebar y su estado expandido/inverso, icono, etiqueta y perfil; un presenter NavigationAction compartido debe conservar esa composición sin padding CTA. Sesión/logout siguen en consumidores. |
| app/ui/select.tsx/SelectionBase + ChoiceGroup (propuesto) | 11 | `app/employee-tasks.tsx`, `app/ia-carga.tsx`, `app/inventory-workspace.tsx`, `app/permissions-matrix.tsx`, `app/sections/comisiones.tsx`, `app/sections/finanzas.tsx` | Opciones de selección/toggle (estado, moneda, cuenta, permiso o entidad), no acción de guardado. Compartir presenter de opción y navegación single/multi con kind explícito; mantener active/aria-pressed, labels, ids y callbacks de selección/permiso. |
| app/foto-perfil.tsx::FotoPerfil | 1 | `app/foto-perfil.tsx` | El botón es la propia superficie avatar/logo con badge/fallback/forma: no se aplica padding CTA. Mantener un renderer de avatar interactivo, separado de foto de equipo y marca. |
| app/google-sign-in.tsx::ProviderSignIn | 1 | `app/google-sign-in.tsx` | Botón de identidad con marcas proveedor y variante compacta del portal; canon local ProviderSignIn conserva anatomía/branding, disponibilidad y callback OAuth. No inferir política de autenticación desde Button. |
| app/ui/navigation/DisclosureTrigger (propuesto) | 3 | `app/inventory-workspace.tsx`, `app/record-assignees.tsx`, `app/workspace-guide.tsx` | Control de expansión ligado a su panel, composición y aria-expanded/controls; unificar trigger estructural de disclosure sin modificar estado, foco ni borrador del panel. |
| app/operations.tsx::CompanySelector → SelectionBase presenter | 2 | `app/operations.tsx` | Selector de empresa: identidad y lista autorizada; conserva switch-organization, default, bloqueo y navegación. Compartir presenter de opción con SelectBase manteniendo orquestación fuera del control. |
| app/password-field.tsx::PasswordField.Visibility | 1 | `app/password-field.tsx` | Accesorio superpuesto dentro del campo; onMouseDown conserva foco/caret, aria-pressed y toggle sólo cambian visibilidad. Base de field-accessory común sin padding de CTA. |
| app/tab-scroller.tsx + ViewTabs/TabList (propuesto) | 1 | `app/productivity-ui.tsx` | Selector de pestañas del detalle con paneles persistidos; migrar conjuntamente navegación/paneles al canon tabs, sin reinterpretarlo como acción o perder contenido visitado. |
| app/productivity-ui.tsx::WorkPlanner → CalendarEventSurface | 1 | `app/productivity-ui.tsx` | Celda/evento del calendario con título y cliente/hora, altura limitada por grilla; conservar composición y callback de pieza, compartiendo sólo foco/tokens de superficie interactiva. |
| app/quote-composer.tsx::ItemShell drag handle (dnd-kit) | 1 | `app/quote-composer.tsx` | Asa estructural de drag con drag.attributes y drag.listeners de dnd-kit; disabled pending va después de los spreads. Preservar sensores teclado/puntero, touchAction:none y geometría del asa, sin padding CTA. |
| app/ui/drag/DragHandle (propuesto) | 1 | `app/sections/pipeline.tsx` | Únicos dos spreads pendientes: drag.attributes y drag.listeners de useDraggable de dnd-kit. Sensor teclado/puntero, aria/ref y touchAction:none requieren asa dedicada, sin padding CTA ni reordenar spreads. |
| app/ui/select.tsx::Selector (trigger / optionNode) | 2 | `app/ui/select.tsx` | Opción canónica single/multi: role option/aria-selected o inline aria-pressed, disabled, choose y contenido provienen del mismo engine. Mantener anatomía de opción, no convertir en acción CTA. |
| app/workspace-forms.tsx::OrderForm choice group | 1 | `app/workspace-forms.tsx` | Opciones de estado/tipo/moneda/cuenta del formulario RHF, no guardar/cancelar. onClick setValue conserva shouldDirty y shouldValidate; PendingFields mantiene bloqueo compartido. Retener geometría de choice y semántica del grupo. |
| app/workspace-forms.tsx::AccountForm choice group | 2 | `app/workspace-forms.tsx` | Opciones de estado/tipo/moneda/cuenta del formulario RHF, no guardar/cancelar. onClick setValue conserva shouldDirty y shouldValidate; PendingFields mantiene bloqueo compartido. Retener geometría de choice y semántica del grupo. |
| app/workspace-forms.tsx::InvoiceForm choice group | 1 | `app/workspace-forms.tsx` | Opciones de estado/tipo/moneda/cuenta del formulario RHF, no guardar/cancelar. onClick setValue conserva shouldDirty y shouldValidate; PendingFields mantiene bloqueo compartido. Retener geometría de choice y semántica del grupo. |
| app/workspace-forms.tsx::PaymentForm choice group | 1 | `app/workspace-forms.tsx` | Opciones de estado/tipo/moneda/cuenta del formulario RHF, no guardar/cancelar. onClick setValue conserva shouldDirty y shouldValidate; PendingFields mantiene bloqueo compartido. Retener geometría de choice y semántica del grupo. |
| app/workspace-guide.tsx::directory → NavigationTile | 1 | `app/workspace-guide.tsx` | Directorio de módulos como grilla navegable; presenter NavigationTile mantiene layout choice y callback go, no se trata como selector de datos ni submit. |

## Validación y reproducción

`node tests/migrate-ui-actions.test.mjs`: **20 PASS**. Comprueba decisiones únicas, hashes, sitios nuevos/desaparecidos, idempotencia, comentarios, alias, callbacks, refs, SSR y submit omitido. El inventario no depende de un número hardcoded: se concilia con los reportes y se audita la fuente real.

`./node_modules/.bin/tsx --test tests/ui-button.test.tsx tests/ui-button-browser.test.tsx tests/ui-architecture.test.mjs`: bases semánticas, límites de arquitectura y Chromium. Browser usa Button real; transporte externo bloqueado. Su prueba geométrica añade los estilos locales en el orden del layout, sin depender de CSS externo o una sesión real. Comprueba desktop 1440/móvil 390, claro/oscuro, CTA login 48px, medium 40/44px, icono compact 32/44px, foco visible con Tab, loading disabled y cero overflow. La otra prueba usa submit/Enter/Space, form externo, ref y type omitido reales.

Evidencia de esta ejecución: `/tmp/scale241-actions-final/button-metrics.json` y `buttons-{light,dark}-{1440,390}.png`. Regenerar con `SCALE_QA_ARTIFACT_DIR=/tmp/scale241-actions-final ./node_modules/.bin/tsx --test tests/ui-button-browser.test.tsx`. Son fixtures de componente con CSS local final, no capturas de producto desplegado.

`node build-tools/check-ui-architecture.mjs`: PASS (318 módulos). `tsc --noEmit --incremental false` y `git diff --check`: PASS. CI, regresión global y deploy corresponden al integrador; no se afirman ejecutados aquí.

Audit reproducible sin escribir producto:

`node build-tools/migrate-ui-actions.mjs --audit --manifest=docs/audits/241-ui-actions-reviewed.json --report=/tmp/actions-final-audit.json`

No reaplicar el manifiesto histórico sobre la fuente final. Toda edición posterior de app cambia los hashes: revisar diff y nuevos sitios, refrescar manifiesto y reporte final y volver a ejecutar las guardas antes de integrar.

## OwnData #353

Se revisaron los cambios de RUC en ClientEditor, ClientRuc, WorkspaceForms y Editor. Los cinco widgets nativos de operations/workspace-forms conservan exactamente sus hashes JSX; cambian posiciones/source hashes. La auditoría mantiene 634 acciones canónicas,53 widgets estructurales y un renderer, cero UNREVIEWED y ninguna exención nueva. El historial original permanece intacto; issue353 documenta los hashes anteriores y actuales.
