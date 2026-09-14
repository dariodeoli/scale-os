import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const file=new URL('../app/scale-workspace.tsx',import.meta.url);
const source=readFileSync(file,'utf8');
const ast=ts.createSourceFile(file.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function functionText(name:string,parent:ts.Node=ast){
 let found:string|undefined;
 const visit=(node:ts.Node)=>{
  if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(ast);
  if(!found)node.forEachChild(visit);
 };
 parent.forEachChild(visit);
 assert.ok(found,`missing ${name}`);
 return found!;
}
function execute<T>(code:string,deps:Record<string,unknown>={}):T{
 const js=ts.transpileModule(code.replace(/^(\s*)export /gm,'$1'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return new Function(...Object.keys(deps),js)(...Object.values(deps)) as T;
}

test('identity changes clear scoped shell state, invalidate stale loads, and remount search only for a changed id, organization, or role',()=>{
 const identityScope=functionText('identityScope');
 const changed=functionText('identityScopeChanged');
 const {identityScopeChanged}=execute<{identityScopeChanged:(previous:unknown,next:unknown)=>boolean}>(`${identityScope}\n${changed}\nreturn {identityScopeChanged};`);
 const current={id:'user-a',organization_id:'agency-a',role:'editor'};
 assert.equal(identityScopeChanged(current,{...current}),false,'same identity scope must retain cached shell state');
 assert.equal(identityScopeChanged(current,{...current,full_name:'Renamed'}),false,'profile changes alone must not reload scoped data');
 for(const next of [{...current,id:'user-b'},{...current,organization_id:'agency-b'},{...current,role:'viewer'}])assert.equal(identityScopeChanged(current,next),true);
 assert.match(source,/if\(!identityScopeChanged\(userRef\.current,d\.user\)\)\{setUser\(d\.user\);return;\}/);
 assert.match(source,/clearScopedShellData\(\);\s*clearDataCache\(\);setDataScope\(nextScope\);setWorkspaceScope\(nextScope\);\s*userRef\.current=d\.user;setUser\(d\.user\);\s*if\(d\.user\.subscription\?\.hasAccess!==false\)void load\(d\.user\)/);
 assert.match(source,/dataLoadSequence\.current\+\+;setGuideData\(\{scope:null,status:'unknown'\}\);/);
 assert.match(source,/setClientStatusFilter\(''\);setMoraFilter\(''\);setProjectClient\(''\);setProductionFiltersDialogScope\(''\);setStartupDataScope\(''\);setWorkspaceScope\(''\);/);
 assert.match(source,/<WorkspaceSearch key=\{workspaceScope\}/);
 assert.match(source,/if\(sequence!==dataLoadSequence\.current\)return;/);
});

test('a failed older production move cannot roll back the latest queued move',async()=>{
 const rollback=functionText('shouldRollbackOrderMutation');
 const drag=functionText('onDragEnd',functionTextNode('Home'));
 type Deferred={status:string;resolve:()=>void;reject:(error:Error)=>void};
 const requests:Deferred[]=[];
 const runner=execute<{
  onDragEnd:(event:unknown)=>Promise<void>;
  orders:()=>{id:string;status:string}[];
  toasts:()=>string[];
 }>(`
  ${rollback}
  let orders=initialOrders;
  const orderMutationVersions={current:new Map()};
  const orderMutationQueue={current:new Map()};
  const messages=[];
  const request=(path,init)=>createRequest(path,init);
  const setOrders=(next)=>{orders=next(orders);};
  const setToast=(message)=>messages.push(message);
  ${drag}
  return {onDragEnd,orders:()=>orders,toasts:()=>messages};
 `,{initialOrders:[{id:'order-1',status:'blocked'}],createRequest:(path:string,init:{body:string})=>new Promise<void>((resolve,reject)=>requests.push({status:JSON.parse(init.body).status,resolve,reject}))});
 const event=(status:string)=>({active:{id:'order-1'},over:{id:`status-${status}`}});
 const first=runner.onDragEnd(event('editing'));
 assert.deepEqual(runner.orders(),[{id:'order-1',status:'editing'}]);
 await Promise.resolve();await Promise.resolve();
 assert.deepEqual(requests.map(request=>request.status),['editing']);
 const second=runner.onDragEnd(event('review'));
 assert.deepEqual(runner.orders(),[{id:'order-1',status:'review'}]);
 assert.deepEqual(requests.map(request=>request.status),['editing'],'the second server write waits behind the first');
 requests[0].reject(Error('first move failed'));
 for(let tick=0;tick<4;tick++)await Promise.resolve();
 assert.deepEqual(requests.map(request=>request.status),['editing','review'],'the latest move is sent after the failed predecessor');
 requests[1].resolve();
 await Promise.all([first,second]);
 assert.deepEqual(runner.orders(),[{id:'order-1',status:'review'}]);
 assert.deepEqual(runner.toasts(),['first move failed'],'the failed request still reports feedback');
});

function functionTextNode(name:string){
 const node=ast.statements.find(statement=>ts.isFunctionDeclaration(statement)&&statement.name?.text===name);
 assert.ok(node,`missing ${name}`);
 return node;
}
