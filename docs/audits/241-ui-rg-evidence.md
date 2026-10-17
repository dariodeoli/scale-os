# Evidencia local de búsquedas — #241

Snapshot de producto: `17fb189e`. Sólo se consultó fuente local de Scale. Estos comandos son de lectura; los resultados se conservaron para revisar los conteos y decisiones. El grafo completo y su método están en [241-ui-consumers.md](241-ui-consumers.md).

## Conteos léxicos cruzados con el parser

Comando por símbolo: `rg -o "<NOMBRE\b" app -g "*.tsx" | wc -l`. La columna AST excluye comentarios y resuelve el origen.

| Nombre | rg | JSX real / aclaración |
| --- | ---: | --- |
| button | 520 | 519; el comentario de dialog.tsx:172 añade 1 al grep |
| input | 98 | 98 |
| textarea | 23 | 23 |
| select | 4 | 4 |
| Dialog | 93 | 93, motor único |
| ConfirmDialog | 32 | 32 |
| Editor | 52 | 52 |
| SelectCustom | 73 | 73 |
| SearchField | 20 | 20; local 4 + importado directo 16 |
| Button | 78 | 77; el comentario de dialog.tsx:170 añade 1 al grep |

Esto evita declarar duplicados a partir de grep sin revisar comentarios ni imports homónimos. El parser distingue también `export type` de exports de valor: PipelineColumn de inventario comparte nombre con un tipo y no debe atribuirse al archivo de datos como si fuera un renderer.

## Definiciones de las fachadas y modelos compartidos

```sh
rg -n -o '^export (function|const) (Dialog|ConfirmDialog|FormActions|Editor|SelectCustom|PersonSelect|AmountInput|SearchField|FotoPerfil|ListGrid|ListRow|ActionMenu|ErrorBlock|LoadingBlock|EmptyBlock|ListPage|FilterToolbar)' app -g '*.tsx'
```

```text
app/search-field.tsx:7:export function SearchField
app/ui-v2.tsx:72:export function ActionMenu
app/ui-v2.tsx:360:export function LoadingBlock
app/ui-v2.tsx:395:export function EmptyBlock
app/ui-v2.tsx:427:export function ErrorBlock
app/ui-v2.tsx:516:export function ListPage
app/ui-v2.tsx:540:export function FilterToolbar
app/ui-v2.tsx:557:export function ListGrid
app/ui-v2.tsx:597:export function ListRow
app/foto-perfil.tsx:38:export function FotoPerfil
app/dialog.tsx:117:export function Dialog
app/dialog.tsx:144:export function FormActions
app/dialog.tsx:190:export function ConfirmDialog
app/operations.tsx:96:export function Editor
app/profile-controls.tsx:20:export function AmountInput
app/profile-controls.tsx:37:export function SelectCustom
app/profile-controls.tsx:43:export function PersonSelect
```

## Dialog vía operations sigue siendo el mismo export

```sh
rg -n -o 'export \{Dialog\} from .+' app/operations.tsx
```

```text
64:export {Dialog} from './dialog';
```

## Imports lazy locales: no crear una implementación por binding

```sh
rg -n -o 'dynamic\(\(\)=>import\(['\''"][^'\''"]+['\''"]\)\.then\([^)]*\)' app -g '*.tsx'
```

```text
app/sections/resumen.tsx:10:dynamic(()=>import('../productivity-ui').then(m=>m.WorkPlanner)
app/sections/resumen.tsx:11:dynamic(()=>import('../work-history').then(m=>m.InternalTasks)
app/sections/prevision.tsx:5:dynamic(()=>import('../financial-forecast').then(m=>m.FinancialForecast)
app/sections/configuracion.tsx:9:dynamic(()=>import('../deletion-danger-zone').then(m=>m.DeletionDangerZone)
app/sections/configuracion.tsx:10:dynamic(()=>import('../company-legal-profile').then(m=>m.CompanyLegalProfile)
app/sections/invitaciones.tsx:5:dynamic(()=>import('../invite-links').then(m=>m.InviteLinks)
app/sections/metricas.tsx:10:dynamic(()=>import('../growth-dashboard').then(m=>m.GrowthDashboard)
app/sections/historial.tsx:5:dynamic(()=>import('../work-history').then(m=>m.WorkHistory)
app/sections/inventario.tsx:5:dynamic(()=>import('../inventory-workspace').then(m=>m.InventoryWorkspace)
app/scale-workspace.tsx:29:dynamic(()=>import('./demo-toolbar').then(m=>m.DemoToolbar)
app/scale-workspace.tsx:30:dynamic(()=>import('./demo-toolbar').then(m=>m.DemoWelcome)
app/scale-workspace.tsx:31:dynamic(()=>import('./my-profile').then(m=>m.MyProfile)
app/scale-workspace.tsx:32:dynamic(()=>import('./ia-carga').then(m=>m.IaCargaDialog)
app/scale-workspace.tsx:33:dynamic(()=>import('./client-editor').then(m=>m.ClientEditorDialog)
app/scale-workspace.tsx:34:dynamic(()=>import('./presence').then(m=>m.PresenceTracker)
app/scale-workspace.tsx:37:dynamic(()=>import('./productivity-ui').then(m=>m.WorkDetail)
app/scale-workspace.tsx:38:dynamic(()=>import('./productivity-ui').then(m=>m.ClientDetail)
app/scale-workspace.tsx:99:dynamic(()=>import('./contracts-workspace').then(m=>m.ContractsWorkspace)
app/sections/actividad.tsx:6:dynamic(()=>import('../presence').then(m=>m.UsagePanel)
app/sections/informes.tsx:5:dynamic(()=>import('../reports-workspace').then(m=>m.ReportsWorkspace)
app/sections/equipo.tsx:5:dynamic(()=>import('../operations').then(m=>m.OperationsWorkspace)
app/sections/pipeline.tsx:31:dynamic(()=>import('../live-visitors').then(m=>m.LiveVisitors)
app/sections/produccion.tsx:16:dynamic(()=>import('../productivity-ui').then(m=>m.WorkPlanner)
app/sections/estudio.tsx:5:dynamic(()=>import('../studio-workspace').then(m=>m.StudioWorkspace)
app/person-photo.tsx:9:dynamic(()=>import('./photo-cropper').then(m=>m.PhotoCropper)
app/profile-photo.tsx:11:dynamic(()=>import('./photo-cropper').then(m=>m.PhotoCropper)
```

## Selector cambia renderer mediante texto o foto

```sh
rg -n -o 'const people=.+;' app/profile-controls.tsx
```

```text
39:const people=choices.some(choice=>choice.kind==='person'||choice.photoUrl!==undefined)||/persona|custodio|responsable|empleado|integrante|asignad[oa]|vendedor|colaborador/i.test(label);
```

## Aplicación genérica de lookup frente a confirmación RUC

```sh
rg -n -o 'form\.setValue\(key,String\(next\)[^;]+' app/operations.tsx
```

```text
178:form.setValue(key,String(next),{shouldValidate:true,shouldDirty:true})
```

## El cliente añade revisión explícita

```sh
rg -n -o 'rucAfter|onApply|onDiscard|rucApplyValues|new Promise<Record<string,string>>' app/client-editor.tsx
```

```text
14:rucApplyValues
44:new Promise<Record<string,string>>
50:rucAfter
51:onApply
51:rucApplyValues
52:onDiscard
54:rucAfter
```

## Drawer y overlays comparten infraestructura

```sh
rg -n -o 'variant="drawer"|size="drawer"|useOverlay\(' app -g '*.tsx'
```

```text
app/productivity-ui.tsx:87:variant="drawer"
app/productivity-ui.tsx:146:variant="drawer"
app/my-data.tsx:77:variant="drawer"
app/inventory-workspace.tsx:538:size="drawer"
app/photo-viewer.tsx:11:useOverlay(
app/mobile-navigation.tsx:16:useOverlay(
app/dialog.tsx:98:useOverlay(
app/project-card.tsx:82:size="drawer"
app/person-sheet.tsx:36:size="drawer"
```

## Exports sin consumidor JSX directo conservan tests

```sh
rg -n -o 'PhotoViewer|BlogArticleTemplate|comment-composer|SerialTexto' tests/dialog-interactions.test.tsx tests/blog-templates.test.tsx tests/plt-152.test.ts tests/list-format.test.tsx
```

```text
tests/list-format.test.tsx:9:SerialTexto
tests/list-format.test.tsx:19:SerialTexto
tests/list-format.test.tsx:24:SerialTexto
tests/list-format.test.tsx:28:SerialTexto
tests/dialog-interactions.test.tsx:16:PhotoViewer
tests/dialog-interactions.test.tsx:111:PhotoViewer
tests/plt-152.test.ts:27:comment-composer
tests/blog-templates.test.tsx:10:BlogArticleTemplate
tests/blog-templates.test.tsx:47:BlogArticleTemplate
tests/blog-templates.test.tsx:50:BlogArticleTemplate
tests/blog-templates.test.tsx:81:BlogArticleTemplate
```

## Fuentes del catálogo local de fixtures

```sh
rg --files build-tools/visual-harness/fixtures
```

```text
build-tools/visual-harness/fixtures/auth-portal-landing.mjs
build-tools/visual-harness/fixtures/admin-audit-155.mjs
build-tools/visual-harness/fixtures/admin-redesign.mjs
build-tools/visual-harness/fixtures/shell-loading.mjs
build-tools/visual-harness/fixtures/pipeline-182.mjs
build-tools/visual-harness/fixtures/comercial-fichas.mjs
build-tools/visual-harness/fixtures/admin-errores-reportes.mjs
build-tools/visual-harness/fixtures/equipo-config.mjs
build-tools/visual-harness/fixtures/ia-carga-120.mjs
build-tools/visual-harness/fixtures/primitivas.mjs
build-tools/visual-harness/fixtures/secciones-comercial.mjs
build-tools/visual-harness/fixtures/fotos-perfil.mjs
build-tools/visual-harness/fixtures/ia-carga-128.mjs
build-tools/visual-harness/fixtures/admin-uso.mjs
build-tools/visual-harness/fixtures/admin-comunicados.mjs
build-tools/visual-harness/fixtures/al4-a11y-154.mjs
build-tools/visual-harness/fixtures/admin-mobile-155.mjs
build-tools/visual-harness/fixtures/compact-sistema.mjs
build-tools/visual-harness/fixtures/ia-carga-118.mjs
build-tools/visual-harness/fixtures/blog-editorial.mjs
build-tools/visual-harness/fixtures/acceso-v2.mjs
build-tools/visual-harness/fixtures/plt-superadmin-v2.mjs
build-tools/visual-harness/fixtures/ops-inventario-estudio.mjs
build-tools/visual-harness/fixtures/plt-helpers-v2.mjs
build-tools/visual-harness/fixtures/ia-carga-132.mjs
build-tools/visual-harness/fixtures/patrones-138.mjs
build-tools/visual-harness/fixtures/admin-shell.mjs
build-tools/visual-harness/fixtures/pdp-privacidad-113.mjs
build-tools/visual-harness/fixtures/densidad-sistema.mjs
build-tools/visual-harness/fixtures/_list-cells.mjs
build-tools/visual-harness/fixtures/ops-detalles-formularios.mjs
build-tools/visual-harness/fixtures/pipeline-planes-superadmin.mjs
build-tools/visual-harness/fixtures/clientes.mjs
build-tools/visual-harness/fixtures/ops-produccion-proyectos.mjs
build-tools/visual-harness/fixtures/tanda51-footer-inbox.mjs
build-tools/visual-harness/fixtures/plt-v2.mjs
build-tools/visual-harness/fixtures/referencias-v2.mjs
build-tools/visual-harness/fixtures/al4-estados.mjs
build-tools/visual-harness/fixtures/resumen-presupuestos.mjs
build-tools/visual-harness/fixtures/finanzas-mora-prevision-informes.mjs
build-tools/visual-harness/fixtures/plt-paneles.mjs
build-tools/visual-harness/fixtures/_admin-shell.mjs
build-tools/visual-harness/fixtures/a11y-124.mjs
```

## No se detecta ruta de catálogo UI en app

```sh
rg -n -o 'catálogo visual|biblioteca visual|Storybook|storybook|ui-catalog|/biblioteca' app
```

```text
(sin coincidencias)
```

## Cobertura de directorios y landing

`rg --files app | wc -l` devolvió 340. `rg --files app -g "*.css" | wc -l` devolvió 48. Los 190 TSX se listan completos en el anexo de consumidores. Hay 24 TSX en app/sections, 25 en app/superadmin y 6 en app/cliente.

La landing HTML (sin comentarios) contiene 1 button, 6 input, 1 textarea y 5 enlaces con clase button. No se mezclan con los conteos JSX. El footer HTML se genera a partir de WorkspaceFooter; no es otro pie independiente que reescribir.
