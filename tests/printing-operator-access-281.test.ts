import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {CAPABILITY_ROLES,effectiveCapability} from '../app/capabilities';
import {visibleModule} from '../app/workspace-access';
import {childSections,moduleNavGroup,navGroups,parentSection,sectionLabel,sectionPath,validSection} from '../app/navigation';

const label='Impresión 80 mm';
const roles=['owner','admin','management','production','finance','sales','editor','viewer','collaborator'];
test('operator printing is a canonical Resources route, independent of Settings',()=>{
 assert.equal(sectionPath(label),'/impresion');
 assert.equal(sectionLabel('/impresion'),label);
 assert.equal(validSection('impresion'),true);
 assert.equal(parentSection(label),label);
 assert.deepEqual(childSections(label),[label]);
 assert.equal(moduleNavGroup(label),'Recursos');
 assert(navGroups.find(([group])=>group==='Recursos')?.[1].some(item=>item===label));
 assert.equal(visibleModule('Configuración','production'),false);
 assert.equal(visibleModule(label,'production'),true);
 assert.equal(visibleModule('Configuración','management'),false);
 assert.equal(visibleModule(label,'management'),true);
});
test('printing defaults and authoritative overrides match API access, retaining the viewer hard deny',()=>{
 assert.deepEqual(CAPABILITY_ROLES['printing.print'],['owner','admin','management','production']);
 assert.deepEqual(CAPABILITY_ROLES['printing.manage'],['owner','admin']);
 for(const role of roles){
  assert.equal(visibleModule(label,role),['owner','admin','management','production'].includes(role),role);
  for(const print of [true,false])for(const manage of [true,false]){
   const overrides={'printing.print':print,'printing.manage':manage,'settings.manage':false};
   assert.equal(visibleModule(label,role,overrides),role==='owner'||role!=='viewer'&&(print||manage),`${role} print=${print} manage=${manage}`);
  }
 }
 assert.equal(visibleModule(label,'production',{'printing.print':false}),false);
 assert.equal(visibleModule(label,'admin',{'printing.print':false}),true,'manage capability can open the workspace');
 assert.equal(visibleModule(label,'sales',{'printing.print':true}),true,'API-granted access is respected');
 assert.equal(visibleModule(label,'viewer',{'printing.print':true,'printing.manage':true}),false);
 assert.equal(effectiveCapability('owner','printing.print',{'printing.print':false}),true);
});
test('shell gates the route before mount and remounts the canonical component per tenant/user',()=>{
 const source=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 assert.match(source,/const active=signedIn&&!visibleModule\(requestedSection,user\?\.role\|\|'viewer',user\?\.capabilities\)\?'Sin acceso':requestedSection/);
 assert.match(source,/const PrintingWorkspace=dynamic\(\(\)=>import\('\.\/printing-workspace'\)/);
 assert.match(source,/active==='Impresión 80 mm'&&user&&<PrintingWorkspace key=\{`\$\{user.organization_id\}:\$\{user.id\}:\$\{!!user.demo_owner_user_id\}`\} scopeKey=\{`\$\{user.organization_id\}:\$\{user.id\}:\$\{!!user.demo_owner_user_id\}`\} demo=\{!!user.demo_owner_user_id\}/);
 assert.match(source,/'Impresión 80 mm':Printer/);
});
