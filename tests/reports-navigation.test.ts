import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectionLabel,sectionPath,validSection,parentSection} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
import {workspaceSource} from './workspace-source';
assert.equal(sectionPath('Informes'),'/informes');
assert.equal(sectionLabel('/informes'),'Informes');
assert(validSection('informes'));
assert.equal(parentSection('Informes'),'Informes');
for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator']){
 assert.equal(visibleModule('Informes',role),['owner','admin','finance','sales'].includes(role),role);
}
const workspace=workspaceSource();
assert(workspace.includes("dynamic(()=>import('../reports-workspace')"));
assert(workspace.includes('["Informes", BarChart3]'));
assert(workspace.includes("active==='Informes'&&<InformesSection user={user} onCreateInvoice={openInvoice}/>"));
assert(workspace.includes("const openInvoice = () => {setActive('Finanzas');setModal('invoice');}"),'los vacíos FIN abren el alta de factura en Finanzas (ronda 14, #62)');
assert(workspace.includes('<MoraSection user={user}')&&workspace.includes('onCreateInvoice={openInvoice}'));
assert(workspace.includes("active==='Previsión'&&<PrevisionSection user={user} navigate={setActive} onCreateInvoice={openInvoice}/>"));
assert(workspace.includes('<ReportsWorkspace key={user?.organization_id}'));
assert(workspace.indexOf('if(user?.subscription?.hasAccess===false)return')<workspace.indexOf('<ReportsWorkspace key='));
const detail=readFileSync(new URL('../app/productivity-ui.tsx',import.meta.url),'utf8');
assert(detail.includes('<ClientReporting key={id} id={id} role={role} onSaved={reload}/>'));
console.log('PASS: direct reports route, lazy tenant-keyed module, unchanged financial roles and subscription gate; client reporting integrated into profile. Not browser QA.');
