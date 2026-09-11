import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectionLabel,sectionPath,validSection,parentSection} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
assert.equal(sectionPath('Informes'),'/informes');
assert.equal(sectionLabel('/informes'),'Informes');
assert(validSection('informes'));
assert.equal(parentSection('Informes'),'Informes');
for(const role of ['owner','admin','management','finance','sales','production','editor','viewer']){
 assert.equal(visibleModule('Informes',role),['owner','admin','finance'].includes(role),role);
}
const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
assert(workspace.includes('dynamic(()=>import(\'./reports-workspace\')'));
assert(workspace.includes('["Informes", BarChart3]'));
assert(workspace.includes('active === "Informes" && <ReportsWorkspace key={user?.organization_id}'));
assert(workspace.indexOf('if(user?.subscription?.hasAccess===false)return')<workspace.indexOf('<ReportsWorkspace key='));
const detail=readFileSync(new URL('../app/productivity-ui.tsx',import.meta.url),'utf8');
assert(detail.includes('<ClientReporting key={id} id={id} role={role} onSaved={reload}/>'));
console.log('PASS: direct reports route, lazy tenant-keyed module, unchanged financial roles and subscription gate; client reporting integrated into profile. Not browser QA.');
