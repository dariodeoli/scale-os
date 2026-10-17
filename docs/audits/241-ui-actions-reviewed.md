# #241 — Decisiones revisadas de acciones y excepciones estructurales

Fecha:17/10/2026. Fuente de consumidores: `68675d4b`, auditoría local de519 botones nativos consumidores + renderer,77 Button importados y23 IconAction. **No se aplicó el codemod a app**. La única fuente nueva de producto es la fachada `app/ui/icon-action.tsx`; CSS, negocio, versión y deploy quedan fuera de esta entrega.

## Cobertura y resultado

Se revisaron los **140 manual y29 structural**, incluidos JSX, handlers y contexto local de sus68 archivos. El [manifiesto completo](241-ui-actions-reviewed.json) contiene169 decisiones con hashSHA256 del archivo y del elemento JSX completo, posición, propietario, razón y transformación/canon. No se acepta «legacy» como motivo de excepción.

- 87 acciones nativas se convierten a Button/IconButton mediante decisión explícita; incluye falsos estructurales de PhotoCropper/ProfilePhoto y triggers de diálogo que son CTAs normales.
- 23 IconAction cambian sólo su import hacia la fachada local; callbacks, labels y props permanecen en el consumidor.
- 59 sitios conservan anatomía estructural con canon explícito, agrupados abajo. No cuentan como acciones migradas ni como implementación nueva de esos canónicos.

Al sumar450 propuestas automáticas anteriores, el dry-run completo arroja **560 migraciones,59 estructurales revisados,1 renderer nativo y2 consumidores canónicos; manual=0 y UNREVIEWED=0** en esta rama (el segundo consumidor canónico corresponde a la fachada IconAction nueva). Esto acredita clasificación, no migración aplicada, geometría final ni producción. Antes de escribir sobre un SHA distinto se deben revisar los diffs y renovar los hashes afectados; no se desactiva la guarda para forzar el manifiesto viejo.

## Decisiones de compatibilidad

`text-button danger` → `variant="ghost" color="danger"`: `globals.css` conserva fondo transparente y tono danger de hover. `secondary danger` → `variant="outline" color="danger"`: `ui-system.css:221` usa borde/texto danger y fondo de superficie. No convertir esos casos en un filled danger por la palabra «danger».

Cada className dinámico se mantiene intacto y se evalúa una vez. Cuando su prefijo ya fija la acción (secondary/FIELD_ACTION/PRIMARY/SECONDARY/text-button), se proporciona variante constante revisada. ConfirmDialog, días de gracia y pausar/reactivar usan discriminantes de datos locales explícitos en el manifiesto; el validador sólo admite expresiones puras y resultados del enum. No admite llamadas, asignaciones ni inventa un parser runtime de clases. Las expresiones leen datos de props/filas API; no se copian ni ejecutan callbacks. Cambiar esos datos a getters exige revisión nueva.

Refs, form, value/name, eventos, aria/data, tipo omitido y children directos se conservan. IconButton recibe el icono ReactNode existente una vez y el aria-label se renombra in situ a label, evitando doble evaluación y manteniendo orden de props. El glifo de quitar mención tiene sustitución manual explícita por Lucide X; la herramienta no deduce iconos desde caracteres.

Los únicos dos spreads pendientes son `drag.attributes` y `drag.listeners` de `useDraggable` (presupuesto y pipeline). Se mantienen orden, sensor, keyboard listeners y touchAction; no se presupone que son props corrientes ni se agranda el asa mediante Button.

## Canon de las59 excepciones estructurales

Los destinos marcados «propuesto» definen responsabilidad futura, no una implementación acreditada. Consolidar presenter/anatomía dentro de la biblioteca interna sin mover callbacks, sesión, permisos ni cálculo. La excepción autoriza conservar el renderer del objeto estructural identificado; no un segundo botón de acción libre por módulo. Button sigue siendo el renderer nativo único para acciones regulares.

| Canon / divisor compartido | Sitios | Consumidores concretos | Razón y condición de consolidación |
| --- | ---: | --- | --- |
| app/assignee-picker.tsx → SelectionBase/AssignedChip | 2 | `app/assignee-picker.tsx`×2 | Control de principal/eliminación dentro del selector múltiple: chips y selección conservan límites, principal y targets; compartir engine de selección, sin tamaño de acción global. |
| app/commenting.tsx + app/comment-composer.tsx → MentionOption/SelectionBase | 2 | `app/comment-composer.tsx`; `app/commenting.tsx` | Opciones de menciones con role=option, aria-selected y onMouseDown que evita perder foco; el motor de selección puede compartir navegación, no el callback de negocio. |
| app/ui/surfaces/CardSurface.Action (propuesto; consumidores actuales conservados) | 15 | `app/control-center.tsx`×3; `app/inventory-workspace.tsx`; `app/production-board.tsx`; `app/productivity-ui.tsx`×2; `app/project-card.tsx`; `app/sections/clientes.tsx`×2; `app/sections/pipeline.tsx`; `app/superadmin/overview.tsx`×2; `app/ui-v2.tsx`; `app/workspace-guide.tsx` | Superficie completa de identidad/título/fila navegable, con layout de texto/imagen/estado y área flexible; no CTA con padding uniforme. Consolidar action-slot estructural de CardSurface, conservar children directos, foco y apertura en callback. |
| app/desktop-sidebar.tsx + mobile-navigation.tsx + superadmin/sidebar.tsx → NavigationAction | 7 | `app/desktop-sidebar.tsx`; `app/mobile-navigation.tsx`; `app/report-problem.tsx`; `app/scale-workspace.tsx`×3; `app/superadmin/sidebar.tsx` | Anatomía del rail/sidebar y su estado expandido/inverso, icono, etiqueta y perfil; un presenter NavigationAction compartido debe conservar esa composición sin padding CTA. Sesión/logout siguen en consumidores. |
| app/ui/select.tsx/SelectionBase + ChoiceGroup (propuesto) | 18 | `app/employee-tasks.tsx`; `app/entity-picker.tsx`×2; `app/ia-carga.tsx`×3; `app/inventory-workspace.tsx`×4; `app/permissions-matrix.tsx`; `app/sections/comisiones.tsx`; `app/sections/finanzas.tsx`; `app/workspace-forms.tsx`×5 | Opciones de selección/toggle (estado, moneda, cuenta, permiso o entidad), no acción de guardado. Compartir presenter de opción y navegación single/multi con kind explícito; mantener active/aria-pressed, labels, ids y callbacks de selección/permiso. |
| app/foto-perfil.tsx::FotoPerfil | 1 | `app/foto-perfil.tsx` | El botón es la propia superficie avatar/logo con badge/fallback/forma: no se aplica padding CTA. Mantener un renderer de avatar interactivo, separado de foto de equipo y marca. |
| app/google-sign-in.tsx::ProviderSignIn | 1 | `app/google-sign-in.tsx` | Botón de identidad con marcas proveedor y variante compacta del portal; canon local ProviderSignIn conserva anatomía/branding, disponibilidad y callback OAuth. No inferir política de autenticación desde Button. |
| app/ui/navigation/DisclosureTrigger (propuesto) | 3 | `app/inventory-workspace.tsx`; `app/record-assignees.tsx`; `app/workspace-guide.tsx` | Control de expansión ligado a su panel, composición y aria-expanded/controls; unificar trigger estructural de disclosure sin modificar estado, foco ni borrador del panel. |
| app/operations.tsx::CompanySelector → SelectionBase presenter | 2 | `app/operations.tsx`×2 | Selector de empresa: identidad y lista autorizada; conserva switch-organization, default, bloqueo y navegación. Compartir presenter de opción con SelectBase manteniendo orquestación fuera del control. |
| app/password-field.tsx::PasswordField.Visibility | 1 | `app/password-field.tsx` | Accesorio superpuesto dentro del campo; onMouseDown conserva foco/caret, aria-pressed y toggle sólo cambian visibilidad. Base de field-accessory común sin padding de CTA. |
| app/tab-scroller.tsx + ViewTabs/TabList (propuesto) | 1 | `app/productivity-ui.tsx` | Selector de pestañas del detalle con paneles persistidos; migrar conjuntamente navegación/paneles al canon tabs, sin reinterpretarlo como acción o perder contenido visitado. |
| app/productivity-ui.tsx::WorkPlanner → CalendarEventSurface | 1 | `app/productivity-ui.tsx` | Celda/evento del calendario con título y cliente/hora, altura limitada por grilla; conservar composición y callback de pieza, compartiendo sólo foco/tokens de superficie interactiva. |
| app/profile-controls.tsx::PlainSelect → app/ui/select.tsx | 2 | `app/profile-controls.tsx`×2 | Trigger/listbox y role=option ya forman un engine de selección: mantener portal, teclado, selección y retorno de foco durante su sustitución conjunta por SelectBase. |
| app/ui/drag/DragHandle (propuesto) | 2 | `app/quote-composer.tsx`; `app/sections/pipeline.tsx` | Únicos dos spreads pendientes: drag.attributes y drag.listeners de useDraggable de dnd-kit. Sensor teclado/puntero, aria/ref y touchAction:none requieren asa dedicada, sin padding CTA ni reordenar spreads. |
| app/workspace-guide.tsx::directory → NavigationTile | 1 | `app/workspace-guide.tsx` | Directorio de módulos como grilla navegable; presenter NavigationTile mantiene layout choice y callback go, no se trata como selector de datos ni submit. |

Selección comparte primero contenido/estado de opción y navegación pertinentes, con variant/kind explícitos; no convierte una grilla inline o una matriz de permisos en popup/listbox por similitud visual. Las dos opciones de menciones comparten presentación y navegación manteniendo anclaje al caret. CardSurface.Action/IdentityAction y NavigationAction son divisores de superficies completas, no nuevos estilos de CTA. DisclosureTrigger comparte anatomía/ARIA con quien posee el panel, sin centralizar su estado. CompanySelector sigue siendo adaptador de Scale sobre presenter autorizado. La visibilidad de contraseña mantiene onMouseDown/foco/caret y nunca dispara submit.

## Fachada IconAction local

Sólo se leyó el vocabulario de consumidores de Scale. Mapa explícito: `check→Check`, `clock→Clock`, `close→X`, `edit→Pencil`, `eye→Eye`, `package→Package`, `refresh→RefreshCw`, `sliders→SlidersHorizontal`, `trash→Trash2`; todos Lucide ya usados en app. Las dos expresiones `quick.icon` de inventario sólo seleccionan verify/detail (`check`/`eye`) en `inventoryItemActions`; otros iconos del menú no llegan a esos sitios. Una key desconocida falla explícitamente en lugar de mostrar un icono distinto sin aviso.

La fachada delega a IconButton; tonos `fono/ok/warn/bad`→`brand/success/warning/danger`, sin tono→neutral. Mantiene label, ariaLabel/aria-label explícitos, title, onClick, disabled, loading, ref y props nativas. `size` admite los tamaños del canon; los23 consumidores actuales no pasan size, por lo que se usa compact. No se promete compatibilidad con tamaños externos no observados. El default type=button es explícito para esta fachada de acciones; un type proporcionado se respeta. Native Button/IconButton mantienen la política de tipo omitido indicada en la fundación.

## Guardas y comandos

```sh
node --test tests/migrate-ui-actions.test.mjs
./node_modules/.bin/tsx --test tests/ui-icon-action.test.tsx
node build-tools/migrate-ui-actions.mjs --audit --manifest=docs/audits/241-ui-actions-reviewed.json --report=/tmp/actions-reviewed.json
# Sólo el integrador, tras sincronizar y revisar hashes, aplica un archivo por vez:
node build-tools/migrate-ui-actions.mjs --write app/archivo.tsx --manifest=docs/audits/241-ui-actions-reviewed.json --report=/tmp/actions-applied.json
```

Escritura exige paths explícitos y **cero sitios manual/structural sin revisar** entre los seleccionados; un sitio nuevo pendiente bloquea todas las escrituras planificadas. Hash de archivo/contexto o JSX distinto, decisión huérfana/duplicada, expresión insegura, salida inválida o conflicto de edición también bloquean. Audit/dry-run no modifican app; un reporte sólo puede reemplazar otro reporte identificado de la herramienta. Se mantienen validación sintáctica previa de todas las salidas y comprobación de que la fuente no cambió durante planificación. Un error de disco durante escritura no constituye transacción multiarchivo; aplicar secuencialmente y conservar Git limpio.

Verificación de esta entrega:18 fixtures AST PASS;2 tests de fachada PASS; typecheck focal y diff --check PASS; dry-run local completo con0 UNREVIEWED. Los fixtures verifican hash obsoleto, sitios desaparecidos/nuevos, no escritura parcial por validación, alias, comentarios, submit implícito, SSR, ref/props/callbacks y evaluación única mediante ejecución de TSX transpiliado. Sin inspección externa de OwnCoding, suites globales, navegador adicional, CI ni deploy. Tras aplicar, el integrador debe comprobar cero acciones fuera del canon salvo estas excepciones revisadas, actualizar inventario al SHA final y ejecutar QA visual/teclado/permisos según el plan consolidado.
