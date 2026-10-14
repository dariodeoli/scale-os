import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {teamSource,teamWorkspaceSource} from './team-source';

// Ronda 14 (#62) + compactación desktop (#92) + auditoría PLT (#139) + #186:
// contratos de la toolbar de Equipo (`ListPage` + `FilterToolbar`), la tarjeta
// compacta de la cuadrícula, la salida de la franja de facturación y los CTA de
// los vacíos.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const team=teamWorkspaceSource();
const operations=teamSource();
const css=read('app/operations.css');

test('la toolbar de Equipo usa ListPage + FilterToolbar con filtros segmentados y vista v2',()=>{
 assert.match(team,/<ListPage\s+className="directory"\s+aria-label="Personas, accesos y remuneraciones"/);
 assert.match(team,/<FilterToolbar className="mb-0" summary=\{<span role="status" aria-atomic="true">\{summary\}<\/span>\}>/);
 assert.match(team,/<SegmentedField [\s\S]*?ariaLabel="Filtrar por estado laboral"/);
 assert.match(team,/options=\{\[\['all','Todos'\],\['active','Activos'\],\['inactive','Inactivos'\]\]\}/);
 assert.match(team,/<SearchField className="w-full sm:w-72" label="Buscar persona" hideLabel/);
 assert.match(team,/<ViewSwitch value=\{view\} onChange=\{changeView\}\/>/);
 assert.match(team,/localStorage\.getItem\(TEAM_VIEW_KEY\)/,'la vista Lista/Cuadrícula se recuerda por usuario');
 assert.match(team,/const TEAM_VIEW_KEY='scale:team-view'/);
 assert.doesNotMatch(team,/choice-list|team-filters|ViewToggle/,'sin la botonera legacy ni la barra propia');
 assert.match(team,/const summary=`\$\{visible\.length\} de \$\{directory\.length\}/);
 assert.doesNotMatch(css,/\.team-filters|\.team-search|\.team-count|\.team-actions/,'sin reglas CSS huérfanas de la toolbar legacy');
});

test('la sección no repite la identidad del shell y la facturación contratada ya no vive en Equipo (#139)',()=>{
 assert.doesNotMatch(operations,/Personas, accesos y remuneraciones<\/h2>/,'la sección no repite el título del shell');
 assert.match(team,/aria-label="Personas, accesos y remuneraciones"/);
 assert.doesNotMatch(operations,/team-billing/,'sin la franja de facturación en la cabecera');
 assert.doesNotMatch(operations,/agency\/control-center/,'Equipo ya no lee el centro de control');
 assert.doesNotMatch(operations,/normalizeCommercialDashboard|CommercialDashboard/,'sin imports muertos del panel comercial');
 assert.doesNotMatch(css,/\.team-billing/,'sin reglas CSS huérfanas de la franja');
});

test('la cuadrícula usa CompactCard con la misma información que la fila',()=>{
 assert.match(team,/<CompactCard\s+key=\{facts\.key\}/);
 assert.match(team,/title=\{<PersonContainer size="md" name=\{facts\.name\}/);
 assert.match(team,/actions=\{items\}/,'el ⋯ de la tarjeta es el mismo menú que el de la fila');
 assert.match(team,/\{facts\.meta\.map\(item=>/,'la tarjeta muestra los mismos datos secundarios');
 assert.doesNotMatch(css,/person-hub/,'sin el CSS de la tarjeta legacy');
});

test('la fila y la tarjeta ofrecen Perfil · Acceso · Eliminar en el menú ⋯ y el lote es contextual',()=>{
 assert.match(team,/<ActionMenu label=\{menuLabel\(facts\)\} items=\{items\}\/>/);
 assert.match(team,/id:'profile',label:'Perfil'/);
 assert.match(team,/id:'access',label:'Acceso'/);
 assert.match(team,/id:'remove',label:'Eliminar',peligro:true/);
 assert.match(team,/<RemoveRecordDialog kind="collaborators"/,'eliminar usa la confirmación canónica de la papelera');
 assert.match(team,/const bulk=useBulkSelection\(\{limit:BATCH_LIMITS\.members,noun:'accesos'\}\)/);
 assert.match(team,/<BulkBar count=\{bulk\.count\} total=\{BATCH_LIMITS\.members\} role=\{role\}/,'la barra de lote es la canónica y solo aparece con selección');
 assert.doesNotMatch(team,/Seleccioná integrantes para operar en lote/,'sin la fila permanente de instrucciones');
});

test('los vacíos de plataforma ofrecen el CTA contextual que corresponda',()=>{
 assert.match(team,/<Plus size=\{16\} aria-hidden="true"\/>Agregar primera persona/);
 assert.match(team,/title=\{hasFilters\?'Sin coincidencias':'Todavía no hay personas'\}/);
 assert.match(read('app/invite-links.tsx'),/action=\{<button type="button" className="secondary" onClick=\{focusCreate\}>Generar enlace<\/button>\}/);
 assert.match(read('app/invite-links.tsx'),/ref=\{createCard\}/);
 assert.match(read('app/permissions-matrix.tsx'),/description="El API no devolvió la matriz de capacidades\." action=\{<button type="button" className="secondary" onClick=\{\(\)=>void load\(\)\}>Reintentar<\/button>\}/);
 assert.match(read('app/superadmin/catalog.tsx'),/Crear el primer cupón/);
 assert.match(read('app/superadmin/catalog.tsx'),/ref=\{codeRef\}/);
});
