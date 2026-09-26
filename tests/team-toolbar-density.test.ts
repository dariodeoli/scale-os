import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// Ronda 14 (#62): contratos de la toolbar compacta de Equipo, el nombre en dos
// líneas de las tarjetas y los CTA de los estados vacíos de plataforma.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const operations=read('app/operations.tsx');
const css=read('app/operations.css');

test('la toolbar de Equipo junta búsqueda, filtros, contador, vista y acciones en una fila',()=>{
 assert.match(operations,/className="team-filters" aria-label="Controles del equipo"/);
 assert.match(operations,/<SearchField className="team-search" label="Buscar persona"/);
 assert.match(operations,/<div className="choice-list compact" role="group" aria-label="Filtrar por estado laboral">/);
 assert.match(operations,/aria-pressed=\{teamFilter==='all'\}/);
 assert.match(operations,/<p className="team-count" role="status" aria-atomic="true">\{peopleSummary\}<\/p>/);
 assert.match(operations,/<ViewSwitch value=\{teamView==='list'\?'list':'grid'\} onChange=\{value=>setTeamView\(value==='list'\?'list':'cards'\)\}\/>/);
 assert.match(operations,/<div className="team-actions">/);
 assert.doesNotMatch(operations,/ViewToggle/,'la vista del equipo usa el control v2 compartido (ViewSwitch)');
 assert.match(operations,/const \[teamFilter,setTeamFilter\]=useState<'all'\|'active'\|'inactive'>\('all'\)/);
 assert.match(operations,/const visiblePeople=filterTeamEntries\(directory,search,teamFilter\)/);
 assert.match(operations,/const peopleSummary=`\$\{visiblePeople\.length\} de \$\{directory\.length\}/);
 assert.match(css,/\.team-filters\{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px 10px;margin-top:12px\}/);
 assert.match(css,/\.team-filters \.workspace-view-controls\{margin-left:auto\}/);
 assert.match(css,/\.team-filters \.team-actions\{[^}]*margin-left:auto\}/);
 assert.doesNotMatch(css,/\.team-filters \{[^}]*max-width:440px/,'la toolbar ya no queda en una columna angosta');
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
