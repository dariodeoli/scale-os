import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {workspaceGuideScope} from '../app/workspace-guide-data';
import {workspacePreferenceKey} from '../app/workspace-preferences';

// Execute Home's actual load function with transport/state doubles. This verifies
// its integration without a browser, production API, or copied implementation.
const source=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('scale-workspace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const home=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='Home') as ts.FunctionDeclaration;
const load=home.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='load')!;
const compiled=ts.transpileModule(load.getText(ast)+'\nreturn load;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const identity={id:'1',organization_id:'7',role:'owner'};
const result=(path:string,n:number)=>path.endsWith('/clients')?{clients:Array(n).fill({id:'1'})}:path.endsWith('/projects')?{projects:[]}:
 path.endsWith('/work-orders')?{workOrders:[]}:{summary:{active_clients:n}};
function harness(request:(path:string)=>Promise<unknown>){
 const state:Record<string,any>={};const sequence={current:0};
 const dependencies:Record<string,unknown>={user:null,dataLoadSequence:sequence,request,workspaceGuideScope,workspacePreferenceKey};
 for(const [setter,key] of [['setGuideData','guide'],['setClients','clients'],['setProjects','projects'],['setOrders','orders'],['setSummary','summary'],['setStartupDataScope','startup']])dependencies[setter]=(v:unknown)=>{state[key]=v;};
 return {state,sequence,load:new Function(...Object.keys(dependencies),compiled)(...Object.values(dependencies)) as (identity?:unknown)=>Promise<void>};
}
test('initial authenticated load uses supplied identity and reports ready counts only after all reads',async()=>{
 const h=harness(async path=>result(path,2));
 await h.load();assert.equal(h.state.guide,undefined,'anonymous load does not invent data');
 await h.load(identity);
 assert.deepEqual(h.state.guide,{scope:workspaceGuideScope({userId:'1',organizationId:'7',role:'owner'}),status:'ready',counts:{clients:2,projects:0,orders:0}});
 assert.equal(h.state.startup,workspacePreferenceKey('1','7'));
});
test('failed reads report error, not empty records or completed setup',async()=>{
 const h=harness(async()=>{throw Error('Offline');});
 await assert.rejects(h.load(identity),/Offline/);
 assert.equal(h.state.guide.status,'error');assert.equal(h.state.guide.counts,undefined);assert.equal(h.state.startup,undefined);
});
test('a superseded or invalidated load cannot overwrite data or guide evidence',async()=>{
 let pending=true;const resolvers:(()=>void)[]=[];
 const h=harness(path=>pending?new Promise(resolve=>resolvers.push(()=>resolve(result(path,99)))):Promise.resolve(result(path,1)));
 const old=h.load(identity);pending=false;await h.load({...identity,id:'2'});
 resolvers.splice(0).forEach(resolve=>resolve());await old;
 assert.equal(h.state.clients.length,1);assert(h.state.guide.scope.includes('"2"'));
 pending=true;const abandoned=h.load(identity);h.sequence.current++;h.state.guide={scope:null,status:'unknown'};
 resolvers.splice(0).forEach(resolve=>resolve());await abandoned;
 assert.deepEqual(h.state.guide,{scope:null,status:'unknown'});assert.equal(h.state.clients.length,1);
 const clearSession=home.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='clearSessionState')!;
 const setters:Record<string,unknown>={dataLoadSequence:h.sequence};
 const setterNames=clearSession.getText(ast).match(/\bset\w+(?=\()/g)!;
 const sharedKeys:Record<string,string>={setClients:'clients',setProjects:'projects',setOrders:'orders',setGuideData:'guide',setStartupDataScope:'startup'};
 for(const name of setterNames)setters[name]=(v:unknown)=>{h.state[sharedKeys[name]||name]=v;};
 const clearCompiled=ts.transpileModule(clearSession.getText(ast)+'\nreturn clearSessionState;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const clear=new Function(...Object.keys(setters),clearCompiled)(...Object.values(setters));
 pending=true;const expired=h.load(identity);clear();
 resolvers.splice(0).forEach(resolve=>resolve());await expired;
 assert.deepEqual(h.state.clients,[]);assert.deepEqual(h.state.projects,[]);assert.deepEqual(h.state.orders,[]);
 assert.equal(h.state.setUser,null);assert.equal(h.state.setSignedIn,false);assert.equal(h.state.startup,'');
 assert.deepEqual(h.state.guide,{scope:null,status:'unknown'});
 assert(source.includes('if(r.status===401){if(!disposed)clearSessionState();return;}'));
 const logout=home.body!.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='logout')!.getText(ast);
 assert(logout.includes('clearSessionState()'));
});
