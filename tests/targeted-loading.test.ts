import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {visibleModule} from '../app/workspace-access';
import {roleCan} from '../app/capabilities';

function component(file:string,name:string){
 const ast=ts.createSourceFile(file,readFileSync(new URL('../app/'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration;
 return {ast,fn};
}
function execute(code:string,deps:Record<string,unknown>){
 const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return new Function(...Object.keys(deps),js)(...Object.values(deps));
}
test('actual team loader: one team read feeds people, members and archived profiles',async()=>{
 const {ast,fn}=component('operations.tsx','PeopleWorkspace');
 const load=fn.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='load')!;
 const calls:string[]=[],resolvers:(()=>void)[]=[],state:Record<string,unknown>={};
 const deps:Record<string,unknown>={api:(path:string)=>{calls.push(path);return new Promise(resolve=>resolvers.push(()=>resolve({collaborators:[{id:'1'}],members:[{id:'2'}],archivedProfiles:[]})))}};
 for(const setter of ['setPeople','setMembers','setArchivedProfiles'])deps[setter]=(value:unknown)=>{state[setter]=value;};
 const run=execute(load.getText(ast)+';return load;',deps);const finished=run();
 assert.deepEqual(calls,['/api/agency/team'],'Equipo reads the team endpoint only');
 assert.equal(Object.keys(state).length,0);resolvers.forEach(resolve=>resolve());await finished;
 assert.deepEqual(state,{setPeople:[{id:'1'}],setMembers:[{id:'2'}],setArchivedProfiles:[]});
});

test('actual company loader renders settings before a slow/failed rate request and ignores unmounted results',async()=>{
 const {ast,fn}=component('suite.tsx','SettingsWorkspace');
 const effect=fn.body!.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='useEffect') as ts.ExpressionStatement;
 const callback=(effect.expression as ts.CallExpression).arguments[0].getText(ast);
 for(const unmount of [false,true]){
  const pending=new Map<string,{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>(),state:Record<string,unknown>={};
  const start=execute('return '+callback,{api:(path:string)=>new Promise((resolve,reject)=>pending.set(path,{resolve,reject})),setSettings:(v:unknown)=>{state.settings=v;},setRates:(v:unknown)=>{state.rates=v;},setNotice:(v:unknown)=>{state.notice=v;},err:(e:Error)=>e.message});
  const cleanup=start();assert.equal(pending.size,2);
  if(unmount)cleanup();
  pending.get('/api/agency/settings')!.resolve({settings:{id:'company'}});await Promise.resolve();await Promise.resolve();
  assert.deepEqual(state.settings,unmount?undefined:{id:'company'});
  assert.equal(state.rates,undefined,'company no longer waits for exchange rates');
  pending.get('/api/agency/exchange-rates')!.reject(Error('rates offline'));await Promise.resolve();await Promise.resolve();
  assert.equal(state.notice,unmount?undefined:'rates offline');cleanup();
 }
});

test('exchange rate editor uses whole PYG values and rejects implausible values before writing',()=>{
 const source=readFileSync(new URL('../app/suite.tsx',import.meta.url),'utf8');
 assert(source.includes("const validPygRate=(value:unknown)=>{const rate=Number(value);return Number.isSafeInteger(rate)&&rate>=1000&&rate<=100000;}"));
 assert(source.includes("{key:'usd_to_pyg',label:'Guaraníes por dólar',type:'money'"));
 assert(source.includes("Ingresá una cotización entera entre G. 1.000 y G. 100.000 por USD."));
 assert(source.includes("G. {formatPygRate(r.usd_to_pyg)}/USD"));
});

test('navigation prefetch requires operational access and visible role, and scope invalidation uses layout phase',()=>{
 const {ast,fn}=component('scale-workspace.tsx','Home');
 const prefetch=fn.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='prefetchSection')!;
 const calls:unknown[][]=[];
 for(const operationalAccess of [false,true])for(const visible of [false,true]){
  const run=execute(prefetch.getText(ast)+';return prefetchSection;',{
   operationalAccess,user:{id:'u',organization_id:'o',role:'viewer'},visibleModule:()=>visible,
   sectionScope:()=>({}),scopeResources:()=>[],
   prefetchSectionData:(...args:unknown[])=>{calls.push(args);},
  });run('Equipo');
 }
 assert.deepEqual(calls,[['Equipo','u:o:viewer']]);
 const layout=fn.body!.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='useLayoutEffect') as ts.ExpressionStatement;
 assert(layout,'scope changes run before child passive fetch effects');
 const callback=(layout.expression as ts.CallExpression).arguments[0].getText(ast);
 const scopes:string[]=[];
 for(const operationalAccess of [true,false])execute('return '+callback,{operationalAccess,user:{id:'u',organization_id:'o',role:'viewer'},setDataScope:(scope:string)=>scopes.push(scope)})();
 assert.deepEqual(scopes,['u:o:viewer','']);
});

test('Inventory prefetch follows inventory.view: every role warms it, unknown roles do not',()=>{
 const {ast,fn}=component('scale-workspace.tsx','Home');
 const prefetch=fn.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='prefetchSection')!;
 for(const role of ['owner','admin','management','production','finance','editor','viewer','sales','collaborator','unknown']){
  const calls:unknown[][]=[];
  const run=execute(prefetch.getText(ast)+';return prefetchSection;',{
   operationalAccess:true,user:{id:'u',organization_id:'o',role},visibleModule,roleCan,
   sectionScope:()=>({}),scopeResources:()=>[],
   prefetchSectionData:(...args:unknown[])=>{calls.push(args);},
  });
  run('Inventario');
  assert.equal(calls.length,roleCan(role,'inventory.view')?1:0,role);
  if(role==='sales'){
   assert.equal(calls.length,1,'Sales opens Inventory with inventory.view like the API');
   run('Pipeline');assert.deepEqual(calls,[['Inventario','u:o:sales'],['Pipeline','u:o:sales']]);
  }
 }
});
