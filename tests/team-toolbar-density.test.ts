import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// Ronda 14 (#62) + compactación desktop (#92): contratos de la toolbar de
// Equipo (una fila desde 1280 px, gap 12), el nombre en dos líneas de las
// tarjetas, la franja de facturación (chip/Kpi) y los CTA de los vacíos.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const css=read('app/operations.css');

test('la toolbar de Equipo junta búsqueda, filtros, contador, vista y acciones en una fila',()=>{
 assert.match(operations,/className="team-filters" aria-label="Controles del equipo"/);
 assert.match(operations,/<SearchField className="team-search" label="Buscar persona" hideLabel/);
 assert.match(operations,/<div className="choice-list compact" role="group" aria-label="Filtrar por estado laboral">/);
 assert.match(operations,/aria-pressed=\{teamFilter==='all'\}/);
 assert.match(operations,/<p className="team-count" role="status" aria-atomic="true">\{peopleSummary\}<\/p>/);
 assert.match(operations,/<ViewSwitch value=\{teamView==='list'\?'list':'grid'\} onChange=\{value=>setTeamView\(value==='list'\?'list':'cards'\)\}\/>/);
 assert.match(operations,/<div className="team-actions">/);
 assert.doesNotMatch(operations,/ViewToggle/,'la vista del equipo usa el control v2 compartido (ViewSwitch)');
 assert.match(operations,/const \[teamFilter,setTeamFilter\]=useState<'all'\|'active'\|'inactive'>\('all'\)/);
 assert.match(operations,/const visiblePeople=filterTeamEntries\(directory,search,teamFilter\)/);
 assert.match(operations,/const peopleSummary=`\$\{visiblePeople\.length\} de \$\{directory\.length\}/);
 assert.match(css,/\.team-filters\{display:flex;flex-wrap:wrap;align-items:center;gap:var\(--ui-space-3,12px\);margin-top:0\}/);
 assert.match(css,/\.team-filters \.workspace-view-controls\{margin-left:auto\}/);
 assert.match(css,/@media\(min-width:1280px\)\{\.team-filters\{flex-wrap:nowrap\}/,'la barra queda en una sola fila desde 1280 px');
 assert.match(css,/@media\(max-width:620px\)\{\.team-filters \.team-search\{flex:1 1 100%/,'en mobile el buscador toma su propia fila');
 assert.match(operations,/bulk-bar[\s\S]{0,900}<div className=\{`ops-grid\$\{teamView==='list'\?' ops-grid-list':''\}`\}>/,'la barra de lote encabeza el directorio fuera de la cuadrícula (no ocupa una celda de tarjeta)');
 assert.doesNotMatch(css,/\.ops-grid>\.bulk-bar/,'la barra no depende de una celda de la cuadrícula');
 assert.doesNotMatch(css,/\.team-filters \{[^}]*max-width:440px/,'la toolbar ya no queda en una columna angosta');
});

test('la sección no repite la identidad del shell y la facturación vive en una franja',()=>{
 // El shell ya muestra «Equipo» + el apartado «Personas y accesos»: la sección
 // no dibuja un segundo título; conserva el nombre accesible.
 assert.doesNotMatch(operations,/Personas, accesos y remuneraciones<\/h2>/,'la sección no repite el título del shell');
 assert.match(operations,/aria-label="Personas, accesos y remuneraciones"/);
 // Sin contratos activos: chip pequeño con la explicación en el tooltip.
 assert.match(operations,/<p className="team-billing-note" aria-label="Facturación contratada">/);
 assert.match(operations,/team-billing-note[\s\S]{0,240}<StateChip tone="mute"/);
 assert.doesNotMatch(operations,/kpi-card tone-blue/,'la franja ya no usa la card azul de ancho completo');
 assert.match(operations,/sin contratos activos/);
 assert.match(operations,/no disponible/,'el fallo del centro de control no queda en «calculando» para siempre');
 // Con contratos: el monto en la misma franja, con el Kpi compartido.
 assert.match(operations,/billing\?\.length\?\([\s\S]{0,260}team-billing-strip[\s\S]{0,340}<Kpi/);
 assert.match(operations,/<MoneyText valor=\{Number\(item\.total\)\} currency=\{item\.currency\}/);
 assert.match(css,/\.team-billing-strip\{max-width:min\(100%,24rem\)/);
});

test('la tarjeta de persona es compacta: identidad, correo, chips y acceso una sola vez',()=>{
 assert.match(operations,/<p className="person-hub-mail" title=\{p\.email\|\|undefined\}>\{p\.email\|\|'Sin correo'\}<\/p>/,'el correo vive en una línea secundaria');
 assert.match(operations,/<div className="person-hub-meta">[\s\S]{0,220}accessRole/,'el rol es un chip de la metadata');
 assert.doesNotMatch(operations,/person-hub-facts/,'sin el bloque grande Correo/Acceso/Ingreso');
 assert.match(css,/\.person-hub-card:not\(\.is-list\)>\.person-hub-tail\{display:flex;align-items:center;justify-content:space-between[\s\S]{0,120}border-top/,'el pie (acceso + acciones) va en una línea anclada');
 assert.match(css,/--person-cols:minmax\(9rem,1\.3fr\)[\s\S]{0,180}minmax\(8\.5rem,1fr\) 7rem/,'la fila finita declara sus 7 columnas');
 assert.match(css,/\.person-hub-card\.is-list \.person-hub-meta-label\{display:none\}/,'la etiqueta del chip se oculta en la fila densa');
});

test('la cabecera de Equipo cabe en una fila y el lote es contextual',()=>{
 assert.match(operations,/canManageAccess&&selectedAccess\.length\?<div className="bulk-bar"/,'la barra de lote aparece solo con selección');
 assert.doesNotMatch(operations,/Seleccioná integrantes para operar en lote/,'sin la fila permanente de instrucciones');
 assert.match(css,/@media\(min-width:1280px\)\{\.team-filters\{flex-wrap:nowrap\}/,'la toolbar no se parte en filas en desktop');
});

test('en tarjetas el nombre usa dos líneas con tooltip; la fila finita sigue en una',()=>{
 assert.match(css,/\.ops-grid:not\(\.ops-grid-list\)>\.person-hub-card \.person-container-name,[\s\S]*?\.team-directory-card \.person-container-name\{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;white-space:normal;overflow:hidden;overflow-wrap:anywhere\}/);
 assert.match(operations,/<div className="ops-person" title=\{p\.full_name\}>/);
 assert.match(operations,/<div className="ops-person" title=\{entry\.member!\.full_name\|\|'Integrante sin ficha'\}>/);
 assert.match(read('app/person-container.tsx'),/className="person-container-name" title=\{name\}/);
});

test('los vacíos de plataforma ofrecen el CTA contextual que corresponda',()=>{
 assert.match(operations,/<Plus size=\{16\} aria-hidden="true"\/>Agregar primera persona/);
 assert.match(operations,/title=\{hasFilters\?'Sin coincidencias':'Todavía no hay personas'\}/);
 assert.match(read('app/invite-links.tsx'),/action=\{<button type="button" className="secondary" onClick=\{focusCreate\}>Generar enlace<\/button>\}/);
 assert.match(read('app/invite-links.tsx'),/ref=\{createCard\}/);
 assert.match(read('app/permissions-matrix.tsx'),/description="El API no devolvió la matriz de capacidades\." action=\{<button type="button" className="secondary" onClick=\{\(\)=>void load\(\)\}>Reintentar<\/button>\}/);
 assert.match(read('app/superadmin/catalog.tsx'),/Crear el primer cupón/);
 assert.match(read('app/superadmin/catalog.tsx'),/ref=\{codeRef\}/);
});
