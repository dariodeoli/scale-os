import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupDueAlerts,normalizeSearch,shortDate,DueAlert} from '../app/control-center-data';
import {sections,legacyRoutes,legacyDestination,parentSection,childSections,sectionPath,sectionLabel} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
const records:DueAlert[]=[{id:'1',type:'invoice',name:'DEMO-PRO-3',due:'2026-08-29'},...Array.from({length:4},(_,i)=>({id:String(i+2),type:'work_order',name:'Reel de lanzamiento',due:'2026-09-07',context:`Cliente ${i}`}))];
const snapshot=JSON.stringify(records),groups=groupDueAlerts(records);
assert.equal(groups.length,2);assert.equal(groups[0].name,'DEMO-PRO-3');assert.equal(groups[1].items.length,4);
assert.equal(groups.reduce((n,g)=>n+g.items.length,0),5);assert.equal(JSON.stringify(records),snapshot);
assert.equal(groupDueAlerts([...records,{...records[1],id:'8',due:'2026-09-06'},{...records[1],id:'9',type:'invoice'}]).length,4,'different date and type are not merged');
assert.equal(groupDueAlerts([]).length,0);assert.equal(normalizeSearch(' ÓRBITA '),'orbita');assert.equal(shortDate('invalid'),'Sin fecha');assert(shortDate('2026-09-07').startsWith('7'),'date-only retains calendar day');
for(const [old,path] of Object.entries(legacyRoutes)){assert.equal(sectionPath(sectionLabel(path)),path);assert(!path.startsWith('/'+old+'/'),'no redirect loops');}
assert.equal(parentSection('Mora'),'Pagos');assert.equal(parentSection('Planes'),'Presupuestos');assert.equal(parentSection('Comisiones'),'Equipo');assert.equal(parentSection('Papelera'),'Configuración');
assert.equal(new Set(sections.map(([label])=>parentSection(label))).size,11);
assert.equal(legacyDestination('constructor'),undefined);assert.equal(legacyDestination('toString'),undefined);assert.equal(legacyDestination('mora'),'/pagos/mora');
for(const role of ['owner','admin','management','finance','sales','production','editor','viewer']){
 for(const [label] of sections){if(visibleModule(label,role))assert(childSections(parentSection(label)).filter(child=>visibleModule(child,role)).includes(label),'all previously accessible leaves remain reachable');}
}
assert(!visibleModule('Pagos','sales'));assert(visibleModule('Mora','sales'));assert(!visibleModule('Configuración','production'));assert(visibleModule('Papelera','production'));assert(!visibleModule('Comisiones','editor'));assert(!visibleModule('Equipo','editor'));
const ui=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
for(const hidden of ['Mora','Planes','Comisiones','Papelera'])assert(!ui.slice(ui.indexOf('const nav ='),ui.indexOf('type Client')).includes(`"${hidden}"`));
assert(ui.indexOf('<ControlCenter')<ui.indexOf('className="metrics operational-metrics"'));assert(ui.indexOf('className="metrics operational-metrics"')<ui.indexOf('id="produccion"'));
const css=readFileSync(new URL('../app/control-center.css',import.meta.url),'utf8');assert(!/#[0-9a-f]{3,8}\b/i.test(css),'new stylesheet uses color tokens');
for(const block of css.split('}')){const [selector,body]=block.split('{');if(/(?:^|[\s,.])(?:\.ops-card|\.financial-stat|\.metric)\s*$/.test(selector))assert(!body?.includes('min-height'),'no fixed minimum card height');}
console.log('PASS: grouped alerts, calendar dates, search normalization, 11 menu groups, legacy redirects, all 8 role boundaries, dashboard hierarchy and brand tokens');
