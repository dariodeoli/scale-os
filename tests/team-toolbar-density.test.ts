import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// Ronda 14 (#62) + compactación desktop (#92) + auditoría PLT (#139): contratos
// de la toolbar de Equipo (una fila desde 1280 px, gap 12), el nombre en dos
// líneas de las tarjetas, la salida de la franja de facturación y los CTA de
// los vacíos.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const css=read('app/operations.css');

test('la toolbar de Equipo junta búsqueda, filtros, contador, vista y acciones en una fila',()=>{
 assert.match(operations,/className="team-filters" aria-label="Controles del equipo"/);
 assert.match(operations,/<SearchField className="team-search" label="Buscar persona" hideLabel/);
 assert.match(operations,/<div className="choice-list compact" role="group" aria-label="Filtrar por estado laboral">/);
 assert.match(operations,/aria-pressed=\{teamFilter==='all'\}/);
 assert.match(operations,/<p className="team-count" role="status" aria-atomic="true">\{peopleSummary\}<\/p>/);
 assert.match(operations,/<ViewSwitch value=\{teamView==='list'\?'list':'grid'\} onChange=\{changeTeamView\}\/>/);
 assert.match(operations,/localStorage\.getItem\('scale:team-view'\)/,'la vista Lista/Cuadrícula se recuerda por usuario');
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

test('la sección no repite la identidad del shell y la facturación contratada ya no vive en Equipo (#139)',()=>{
 // El shell ya muestra «Equipo» + el apartado «Personas y accesos»: la sección
 // no dibuja un segundo título; conserva el nombre accesible.
 assert.doesNotMatch(operations,/Personas, accesos y remuneraciones<\/h2>/,'la sección no repite el título del shell');
 assert.match(operations,/aria-label="Personas, accesos y remuneraciones"/);
 // #139: la franja de facturación contratada se retiró del directorio (no
 // aportaba al listado; la expectativa comercial vive en Clientes y Resumen),
 // junto con la lectura del centro de control que solo alimentaba ese Kpi.
 assert.doesNotMatch(operations,/team-billing/,'sin la franja de facturación en la cabecera');
 assert.doesNotMatch(operations,/agency\/control-center/,'Equipo ya no lee el centro de control');
 assert.doesNotMatch(operations,/normalizeCommercialDashboard|CommercialDashboard/,'sin imports muertos del panel comercial');
 assert.doesNotMatch(css,/\.team-billing/,'sin reglas CSS huérfanas de la franja');
});

test('la tarjeta de persona es compacta: identidad, correo, chips y acceso una sola vez',()=>{
 assert.match(operations,/<p className="person-hub-mail" title=\{p\.email\|\|undefined\}>\{p\.email\|\|'Sin correo'\}<\/p>/,'el correo vive en una línea secundaria');
 assert.match(operations,/<div className="person-hub-meta">[\s\S]{0,220}accessRole/,'el rol es un chip de la metadata');
 assert.doesNotMatch(operations,/person-hub-facts/,'sin el bloque grande Correo/Acceso/Ingreso');
 assert.match(css,/\.person-hub-card:not\(\.is-list\)>\.person-hub-tail\{display:flex;align-items:center;justify-content:space-between[\s\S]{0,120}border-top/,'el pie (acceso + acciones) va en una línea anclada');
 assert.match(css,/--person-cols:minmax\(14rem,2\.4fr\)[\s\S]{0,180}minmax\(7\.5rem,\.8fr\) 7rem/,'la fila finita declara sus 7 columnas con Persona priorizada (#110)');
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
