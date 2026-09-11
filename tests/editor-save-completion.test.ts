import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const notices:{tone:string}[]=[];
const feedbackId=require.resolve('../app/feedback');
require.cache[feedbackId]={id:feedbackId,filename:feedbackId,loaded:true,exports:{notify:(notice:{tone:string})=>notices.push(notice)}} as NodeModule;
const {completeSave}=require('../app/save-completion') as typeof import('../app/save-completion');
const cases=[
 ['suite','CatalogWorkspace','Editor','save'],
 ['suite','CatalogWorkspace','QuoteComposer','done'],
 ['suite','MemberActions','Editor','save'],
 ['suite','RecordEditor','Editor','save'],
 ['suite','RecordEditor','RecordAssignees','refresh'],
 ['suite','BudgetActions','QuoteComposer','done'],
 ['team-access','TeamAccess','Editor','save'],
] as const;

// Execute only the actual local callback source with a simulated API and state.
// This is not a DOM/rendering test and cannot send requests or invitations.
for(const [module,name,component,attribute] of cases)test(`${name} ${component}: confirmed save closes despite refresh failure`,async()=>{
 const source=readFileSync(new URL(`../app/${module}.tsx`,import.meta.url),'utf8');
 const file=ts.createSourceFile(`${module}.tsx`,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const parent=file.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 assert(parent);
 const callbacks:ts.Expression[]=[];
 const visit=(node:ts.Node)=>{
  if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(file)===component){
   const prop=node.attributes.properties.find((p):p is ts.JsxAttribute=>ts.isJsxAttribute(p)&&p.name.getText(file)===attribute);
   if(prop?.initializer&&ts.isJsxExpression(prop.initializer)&&prop.initializer.expression)callbacks.push(prop.initializer.expression);
  }
  ts.forEachChild(node,visit);
 };
 visit(parent);
 if(name==='RecordEditor'&&component==='Editor'){
  assert.equal(callbacks.length,2,'client detail saves directly; project/work detail delegates to the unified save');
  const delegated=callbacks.filter(ts.isIdentifier);
  assert.equal(delegated.length,1);
  assert.equal(delegated[0].text,'save');
  let enclosing:ts.Node|undefined=delegated[0].parent;
  while(enclosing&&!ts.isArrowFunction(enclosing))enclosing=enclosing.parent;
  assert(enclosing&&ts.isArrowFunction(enclosing));
  assert.equal(enclosing.parameters.length,1);
  assert.equal(enclosing.parameters[0].name.getText(file),'save','Editor forwards the render-prop save supplied by RecordAssignees');
 }
 else assert.equal(callbacks.length,1);
 const inline=callbacks.filter(node=>ts.isArrowFunction(node));
 assert.equal(inline.length,1,'exactly one persistence/completion callback per save path');
 const callbackSource=inline[0].getText(file);
 assert(callbackSource.includes(attribute==='refresh'?'completeSave(':'await completeSave('));
 let closed=false,refreshes=0,writes=0;
 let persist:()=>Promise<unknown>=async()=>{throw Error('Persist failed');};
 const close=(value:unknown)=>{assert(value===null||value===false);closed=true;};
 const refresh=async()=>{refreshes++;assert.equal(closed,true,'close precedes any refresh');throw Error('Refresh unavailable');};
 const scope={completeSave,api:async()=>{writes++;return persist();},refresh,load:refresh,
  setEdit:close,setOpen:close,setRecord:close,setInvite:close,
  member:{id:'7'},recordId:'8',kind:'leads',row:{id:'9'},
 };
 const compiled=ts.transpileModule(`const callback=${callbackSource};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const callback=new Function(...Object.keys(scope),`${compiled}\nreturn callback;`)(...Object.values(scope)) as (values:Record<string,string>)=>Promise<void>;
 const values={name:'Fixture',email:'fixture@example.invalid',role:'viewer',active:'true'};
 const before=notices.length;
 if(attribute==='save'){
  await assert.rejects(callback(values),/Persist failed/);
  assert.equal(closed,false);assert.equal(refreshes,0);assert.equal(notices.length,before);
  let finish:()=>void=()=>{};
  persist=()=>new Promise<void>(resolve=>{finish=resolve;});
  const pending=callback(values);
  assert.equal(closed,false,'do not close while persistence is pending');assert.equal(refreshes,0);
  finish();await pending;
  assert.equal(writes,2,'one failed request and one explicit retry; refresh never retries persistence');
 }else{
  // QuoteComposer/RecordAssignees call completion only after confirmed persistence.
  await callback(values);assert.equal(writes,0);
 }
 assert.equal(closed,true);assert.equal(refreshes,1);
 assert.equal(notices.length,before+1);assert.equal(notices.at(-1)?.tone,'warning');
});

test('completion covers main save paths including unified assignments, not secondary actions',()=>{
 const suite=readFileSync(new URL('../app/suite.tsx',import.meta.url),'utf8');
 const access=readFileSync(new URL('../app/team-access.tsx',import.meta.url),'utf8');
 assert.equal((suite.match(/await completeSave\(/g)||[]).length,5);
 assert.equal((suite.match(/\bcompleteSave\(/g)||[]).length,6,'unified assignment completion is also covered');
 assert.equal((access.match(/await completeSave\(/g)||[]).length,1);
 assert(suite.includes('refresh={async()=>{await refresh();await open();}}'),'appearance partial saves retain their reload behavior');
 for(const source of [suite,access]){
  const file=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const visit=(node:ts.Node)=>{
   if(ts.isJsxAttribute(node)&&node.name.getText(file)==='onClick')assert(!node.getText(file).includes('completeSave'),'secondary button actions must stay untouched');
   ts.forEachChild(node,visit);
  };
  visit(file);
 }
});
