import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sections,sectionPath,sectionLabel,parentSection,childSections,validSection} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';

assert.equal(sectionPath('Resumen semanal'),'/equipo/resumen-semanal');
assert.equal(sectionLabel('/equipo/resumen-semanal'),'Resumen semanal');
assert.equal(parentSection('Resumen semanal'),'Equipo');
assert(validSection('equipo/resumen-semanal'));
assert(sections.some(([,path])=>path==='equipo/resumen-semanal'));
for(const role of ['owner','admin','management','finance','sales','production','editor','viewer']){
 const allowed=childSections('Equipo').filter(label=>visibleModule(label,role));
 assert(allowed.includes('Resumen semanal'),role);
 if(!['owner','admin','finance'].includes(role))assert.equal(allowed[0],'Resumen semanal');
 assert.equal(visibleModule('Equipo',role),['owner','admin','finance'].includes(role),'No expanded people-management permission');
}
const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
assert(workspace.includes("dynamic(()=>import('./weekly-report')"));
assert(workspace.includes("active==='Resumen semanal'&&user&&<WeeklyReport organizationId={String(user.organization_id)}/>"));
assert(workspace.indexOf('if(user?.subscription?.hasAccess===false)return')<workspace.indexOf('<WeeklyReport organizationId='));
console.log('PASS weekly navigation: direct route, Equipo subtab, own access for all roles, unchanged management permissions, organization scope and subscription gate');
