import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupDueAlerts,normalizeSearch,shortDate,DueAlert} from '../app/control-center-data';
import {sections,legacyRoutes,legacyDestination,parentSection,childSections,sectionPath,sectionLabel,navGroups,moduleNavGroup} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
import {workspaceSource} from './workspace-source';
const records:DueAlert[]=[{id:'1',type:'invoice',name:'DEMO-PRO-3',due:'2026-08-29'},...Array.from({length:4},(_,i)=>({id:String(i+2),type:'work_order',name:'Reel de lanzamiento',due:'2026-09-07',context:`Cliente ${i}`}))];
const snapshot=JSON.stringify(records),groups=groupDueAlerts(records);
assert.equal(groups.length,2);assert.equal(groups[0].name,'DEMO-PRO-3');assert.equal(groups[1].items.length,4);
assert.equal(groups.reduce((n,g)=>n+g.items.length,0),5);assert.equal(JSON.stringify(records),snapshot);
assert.equal(groupDueAlerts([...records,{...records[1],id:'8',due:'2026-09-06'},{...records[1],id:'9',type:'invoice'}]).length,4,'different date and type are not merged');
assert.equal(groupDueAlerts([]).length,0);assert.equal(normalizeSearch(' ÓRBITA '),'orbita');assert.equal(shortDate('invalid'),'Sin fecha');assert(shortDate('2026-09-07').startsWith('7'),'date-only retains calendar day');
// Issue #65: avisos incompletos del API (sin name/due/type, o null) no pueden
// voltear la pantalla; se agrupan con fallbacks y el orden sigue determinista.
const malformed=[null,undefined,{id:'10',type:'invoice'},{id:'11'},{id:'12',type:'invoice',name:null,due:null},{id:'13',type:'invoice',name:'',due:''},{id:'14',type:'work_order',name:'Reel',due:'2026-09-07'}] as unknown as DueAlert[];
const hardened=groupDueAlerts(malformed);
assert.equal(hardened.reduce((n,group)=>n+group.items.length,0),5,'los avisos válidos sobreviven a los incompletos');
assert(hardened.every(group=>typeof group.name==='string'&&typeof group.due==='string'&&Array.isArray(group.items)),'cada grupo queda con nombre/fecha de texto');
assert.equal(hardened.filter(group=>group.name==='Sin nombre').reduce((n,group)=>n+group.items.length,0),4,'los avisos sin nombre comparten el fallback');
assert.deepEqual(hardened.map(group=>group.due),['','','2026-09-07'],'el orden por fecha se mantiene (los sin fecha van primero)');
assert.equal(groupDueAlerts(undefined).length,0,'una lista ausente devuelve vacío, no un throw');
assert.equal(normalizeSearch(undefined as unknown as string),'');
assert.equal(normalizeSearch(null as unknown as string),'');
assert.equal(normalizeSearch(123 as unknown as string),'123');
// Barrido del mismo patrón (issue #65): ningún `normalize` sobre un valor sin guarda.
const profileControls=readFileSync(new URL('../app/profile-controls.tsx',import.meta.url),'utf8');
assert(profileControls.includes('const foldSearch')&&profileControls.includes("String(value ?? '')"),'el SelectCustom pliega labels y búsquedas con guarda');
assert(!/c\.label\.normalize\(/.test(profileControls),'no queda un normalize directo sobre el label de una opción');
const permissionsMatrix=readFileSync(new URL('../app/permissions-matrix.tsx',import.meta.url),'utf8');
assert(permissionsMatrix.includes("String(row?.id??'')")&&permissionsMatrix.includes("String(row?.label??'')"),'la matriz de permisos arma el texto con guarda');
for(const [old,path] of Object.entries(legacyRoutes)){assert.equal(sectionPath(sectionLabel(path)),path);assert(!path.startsWith('/'+old+'/'),'no redirect loops');}
assert.equal(parentSection('Mora'),'Finanzas');assert.equal(parentSection('Planes'),'Presupuestos');assert.equal(parentSection('Comisiones'),'Equipo');assert.equal(parentSection('Papelera'),'Configuración');
assert.equal(new Set(sections.map(([label])=>parentSection(label))).size,12);
assert.equal(sectionPath('Tablero de producción'),'/produccion');assert.equal(sectionLabel('/produccion'),'Producción');
assert.equal(legacyDestination('constructor'),undefined);assert.equal(legacyDestination('toString'),undefined);assert.equal(legacyDestination('mora'),'/pagos/mora');
const nextConfig=readFileSync(new URL('../next.config.mjs',import.meta.url),'utf8');
for(const [old,target] of Object.entries(legacyRoutes))assert(nextConfig.includes(`source: '/${old}', destination: '${target}'`),'legacy paths also have server-level redirects');
for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator']){
 for(const [label] of sections){if(label!=='Métricas'&&visibleModule(label,role))assert(childSections(parentSection(label)).filter(child=>visibleModule(child,role)).includes(label),'all accessible leaves remain reachable; metrics are embedded in Pipeline');}
}
assert(!visibleModule('Pagos','sales'));assert(visibleModule('Mora','sales'));assert(!visibleModule('Configuración','production'));assert(visibleModule('Papelera','production'));assert(!visibleModule('Comisiones','editor'));assert(visibleModule('Equipo','editor'));
const ui=workspaceSource();
// Nav v3 (issue #68): 5 grupos desplegables; los apartados siguen dentro de su
// módulo y las rutas no cambian.
const navModules=navGroups.flatMap(([,modules])=>modules as readonly string[]);
assert.deepEqual(navGroups.map(([group])=>group),['Resumen','Flujo','Recursos','Finanzas','Configuración'],'el menú principal tiene 5 grupos');
assert.equal(new Set(navModules).size,navModules.length,'cada módulo vive en un solo grupo');
for(const [label] of sections)if(['Mora','Previsión','Métricas','Planes','Invitaciones','Comisiones','Roles y permisos','Historial de trabajo','Actividad','Preferencias','Papelera'].includes(label))continue;else assert(navModules.includes(label),`${label} sigue siendo un módulo del menú`);
for(const apartado of ['Mora','Previsión','Métricas','Planes','Invitaciones','Comisiones','Roles y permisos','Historial de trabajo','Actividad','Preferencias','Papelera'])assert(!navModules.includes(apartado),`${apartado} es apartado de su módulo, nunca ítem del menú`);
assert.equal(moduleNavGroup(parentSection('Mora')),'Finanzas');assert.equal(moduleNavGroup(parentSection('Métricas')),'Flujo');assert.equal(moduleNavGroup('Estudio'),'Recursos','Estudio vive en Recursos (agenda de espacios y equipos)');assert.equal(moduleNavGroup(parentSection('Papelera')),'Configuración');assert.equal(moduleNavGroup(parentSection('Invitaciones')),'Recursos');
assert.deepEqual(navGroups.find(([group])=>group==='Recursos')[1],['Inventario','Estudio','Equipo'],'Recursos agrupa los dos reservables y después Equipo (refine OPS #70)');
assert.equal(moduleNavGroup('Sin acceso'),'','fuera del nav no hay grupo activo');
assert(ui.indexOf('<ControlCenter')<ui.indexOf('className="metrics operational-metrics"'));assert(ui.indexOf('className="metrics operational-metrics"')<ui.indexOf('id="produccion"'));
const css=readFileSync(new URL('../app/control-center.css',import.meta.url),'utf8');assert(!/#[0-9a-f]{3,8}\b/i.test(css),'new stylesheet uses color tokens');
for(const block of css.split('}')){const [selector,body]=block.split('{');if(/(?:^|[\s,.])(?:\.ops-card|\.financial-stat|\.metric)\s*$/.test(selector))assert(!body?.includes('min-height'),'no fixed minimum card height');}
console.log('PASS: grouped alerts, calendar dates, search normalization, 12 menu groups, legacy redirects, all 8 role boundaries, dashboard hierarchy and brand tokens');
