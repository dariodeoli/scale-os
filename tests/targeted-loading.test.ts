import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {visibleModule} from '../app/workspace-access';

function component(file:string,name:string){
 const ast=ts.createSourceFile(file,readFileSync(new URL('../app/'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration;
 return {ast,fn};
}
function execute(code:string,deps:Record<string,unknown>){
 const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return new Function(...Object.keys(deps),js)(...Object.values(deps));
}
test('actual team loader: people needs 4 parallel reads, commissions retains its 6 reads',async()=>{
 const {ast,fn}=component('operations.tsx','OperationsWorkspace');
 const load=fn.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='load')!;
 for(const mode of ['people','commissions']){
  const calls:string[]=[],resolvers:(()=>void)[]=[],state:Record<string,unknown>={};
  const deps:Record<string,unknown>={mode,api:(path:string)=>{calls.push(path);return new Promise(resolve=>resolvers.push(()=>resolve({collaborators:[],members:[],archivedProfiles:[],commissions:[],accounts:[],invoices:[],payouts:[],roles:[]})));}};
  for(const setter of ['setPeople','setMembers','setArchivedProfiles','setCommissions','setAccounts','setInvoices','setPayouts','setJobs'])deps[setter]=(value:unknown)=>{state[setter]=value;};
  const run=execute(load.getText(ast)+';return load;',deps);const finished=run();
  assert.equal(calls.length,mode==='people'?4:6,'all requests begin before any response');
  if(mode==='people')assert(!calls.some(path=>/commissions|invoices/.test(path)));
  assert.equal(Object.keys(state).length,0);resolvers.forEach(resolve=>resolve());await finished;
  assert.equal(Object.keys(state).length,8);
 }
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

test('navigation prefetch requires operational access and visible role, and scope invalidation uses layout phase',()=>{
 const {ast,fn}=component('scale-workspace.tsx','Home');
 const prefetch=fn.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='prefetchSection')!;
 const calls:unknown[][]=[];
 for(const operationalAccess of [false,true])for(const visible of [false,true]){
  const run=execute(prefetch.getText(ast)+';return prefetchSection;',{
   operationalAccess,user:{id:'u',organization_id:'o',role:'viewer'},visibleModule:()=>visible,
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

test('Inventory prefetch matches panel roles: Sales issues no warmup, but keeps Pipeline prefetch',()=>{
 const {ast,fn}=component('scale-workspace.tsx','Home');
 const prefetch=fn.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='prefetchSection')!;
 const inventory=component('inventory-workspace.tsx','InventoryWorkspace');
 const declaration=inventory.fn.body!.statements[0] as ts.VariableStatement;
 const allowed=declaration.declarationList.declarations[0].initializer!.getText(inventory.ast);
 for(const role of ['owner','admin','management','production','finance','editor','viewer','sales','unknown']){
  const calls:unknown[][]=[];
  const run=execute(prefetch.getText(ast)+';return prefetchSection;',{
   operationalAccess:true,user:{id:'u',organization_id:'o',role},visibleModule,
   prefetchSectionData:(...args:unknown[])=>{calls.push(args);},
  });
  run('Inventario');
  const panelAllowed=execute('return '+allowed,{role});
  assert.equal(calls.length,panelAllowed?1:0,role);
  if(role==='sales'){
   assert.equal(calls.length,0,'no Inventory requests for Sales despite menu visibility');
   run('Pipeline');assert.deepEqual(calls,[['Pipeline','u:o:sales']]);
  }
 }
});
