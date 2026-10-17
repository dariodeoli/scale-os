import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export const unifiedPrimitives=new Set(['Button','IconButton','IconAction','Input','Textarea','TextField','EmailField','PasswordField','PhoneField','SearchField','MoneyInput','AmountInput','Select','Selector','Label','FormField','Card','DataTable','Aviso','Nota','SegmentedField','Subtabs','TabScroller','Dialog','ConfirmDialog','FormActions','SaveActions','DateInput','TimeInput','DateTimeInput','MonthInput','NumberInput','PercentageInput','InputBase','TextareaBase','NumericControl','Checkbox','Switch','EmptyState','ErrorState']);
const facadeSymbols=new Map(Object.entries({
 'app/ui/surface.tsx':['Card'],'app/ui/collection.tsx':['DataTable'],'app/ui/notice.tsx':['Aviso','Nota'],
 'app/ui/navigation.tsx':['SegmentedField','Subtabs'],'app/ui/amount.tsx':['MoneyInput'],'app/ui/choice.tsx':['Checkbox','Switch'],
 'app/ui-v2.tsx':['EmptyState','ErrorState'],
}));
const pilotSymbols=new Set(['InputBase','TextareaBase','NumericControl','NumberInput','PercentageInput','numberInputProblem','numberInputValid','nativeNumberSettings']);
const pilotFacades=new Map(Object.entries({
 'app/ui/input.tsx':{'owncoding-ui/numeric':['InputBase','TextareaBase']},
 'app/ui/number.tsx':{'owncoding-ui/numeric':['NumericControl','NumberInput','PercentageInput'],'owncoding-ui/number-utils':['numberInputProblem','numberInputValid','nativeNumberSettings']},
}));
const extensions=['.ts','.tsx','.js','.jsx','.mjs','.cjs'];
const clean=value=>value.replaceAll('\\','/').replace(/^\.\//,'');
const pureAdapters=new Set(['app/text-field.tsx','app/email-field.tsx','app/password-field.tsx','app/phone-field.tsx','app/search-field.tsx','app/ui-v2.tsx','app/profile-controls.tsx','app/dialog.tsx','app/save-actions.tsx']);
const isPure=file=>pureAdapters.has(file)||file.startsWith('app/ui/')&&!/^app\/ui\/index\.[cm]?[jt]sx?$/.test(file)&&/\.[cm]?[jt]sx?$/.test(file);
const isImplementation=file=>isPure(file)||new Set(['app/text-field.tsx','app/email-field.tsx','app/password-field.tsx','app/phone-field.tsx','app/search-field.tsx','app/ui-v2.tsx','app/profile-controls.tsx','app/dialog.tsx','app/save-actions.tsx','app/actor-identity.tsx','app/person-container.tsx','app/foto-perfil.tsx','app/operations.tsx']).has(file);
const businessModules=/^(?:backend\/|app\/api\/|app\/(?:operations|workspace-request|data-cache|contracts-data|capabilities|privacy-data|[^/]+-api|[^/]+-request|auth|session)(?:\.|$))/;
const publicEntries=new Set(['app/ui/index.ts','app/scale-ui.ts']);
const businessNames=new Set(['api','dataFetch','contractRequest','transporteError']);
const owncoding=source=>source==='owncoding-ui'||source.startsWith('owncoding-ui/');

/** Inspect local source and module edges; no external package source is read. */
export function auditUiArchitecture(input){
 const sources=new Map([...input].map(([file,source])=>[clean(file),source]));
 const violations=[],edges=new Map();
 const resolve=(from,source)=>{
  const base=source.startsWith('@/')?source.slice(2):source.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(from),source)):null;
  if(!base)return null;
  for(const candidate of [base,...extensions.map(ext=>base+ext),...extensions.map(ext=>base+'/index'+ext)])if(sources.has(candidate))return candidate;
  return base;
 };
 const report=(file,node,code,message,sf)=>violations.push({file,line:sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1,code,message});
 for(const [file,text]of sources){
  const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const dependencies=new Set();edges.set(file,dependencies);
  const checkModule=(node,source,bindings,typeOnly=false)=>{
   const target=resolve(file,source);
   if(target&&/^app\/ui(?:\/index(?:\.[cm]?[jt]sx?)?)?$/.test(target)&&isImplementation(file))report(file,node,'implementation-barrel','An implementation must import direct component paths, never app/ui/index.',sf);
   if(file==='app/ui/index.ts'&&businessModules.test(target??''))report(file,node,'public-business-export','Editor and domain form types belong in app/scale-ui, not the pure UI entry.',sf);
   if(typeOnly)return;
   if(target&&sources.has(target))dependencies.add(target);
   if(isPure(file)&&(businessModules.test(target??'')||source.startsWith('node:')||['axios','undici','node-fetch'].includes(source)))report(file,node,'business-module','Pure UI cannot import a business/API/server module.',sf);
   if(owncoding(source)){
    if(bindings===null){report(file,node,'opaque-owncoding-import','Use auditable named imports/reexports for OwnCoding, not namespace/default/dynamic access.',sf);return;}
    const allowed=source==='owncoding-ui'?(facadeSymbols.get(file)??[]):[];
    const pilotAllowed=pilotFacades.get(file)?.[source]??[];
    const pilotSource=source==='owncoding-ui/numeric'||source.startsWith('owncoding-ui/numeric/')||source==='owncoding-ui/number-utils'||source.startsWith('owncoding-ui/number-utils/');
    for(const name of bindings){
     const denied=pilotSource||pilotSymbols.has(name)?!pilotAllowed.includes(name):unifiedPrimitives.has(name)&&!allowed.includes(name);
     if(denied)report(file,node,'external-primitive',`${name} must come from its local canonical component.`,sf);
    }
   }
   if(isPure(file)&&bindings?.some(name=>businessNames.has(name)))report(file,node,'business-binding','Pure UI cannot import API request functions.',sf);
   if(publicEntries.has(file)&&bindings?.some(name=>businessNames.has(name)))report(file,node,'public-business-export','The public UI entry cannot expose API functions.',sf);
   if(file==='app/scale-ui.ts'&&target?.replace(/\.[cm]?[jt]sx?$/,'')==='app/operations'&&(!bindings||bindings.some(name=>name!=='Editor')))report(file,node,'public-business-export','The Scale form entry may expose only Editor at runtime.',sf);
  };
  const visit=node=>{
   if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)){
    const clause=node.importClause,named=clause?.namedBindings;
    const bindings=named&&ts.isNamedImports(named)?named.elements.filter(el=>!el.isTypeOnly).map(el=>(el.propertyName??el.name).text):clause?null:[];
    checkModule(node,node.moduleSpecifier.text,clause?.name?null:bindings,Boolean(clause?.isTypeOnly||(!clause?.name&&named&&ts.isNamedImports(named)&&named.elements.length>0&&named.elements.every(el=>el.isTypeOnly))));
   }else if(ts.isExportDeclaration(node)&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
    const bindings=node.exportClause&&ts.isNamedExports(node.exportClause)?node.exportClause.elements.filter(el=>!el.isTypeOnly).map(el=>(el.propertyName??el.name).text):null;
    checkModule(node,node.moduleSpecifier.text,bindings,Boolean(node.isTypeOnly||(node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.length>0&&node.exportClause.elements.every(el=>el.isTypeOnly))));
    if(publicEntries.has(file)&&!node.exportClause)report(file,node,'public-wildcard','The UI entry must use selective exports, never export *.',sf);
   }else if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))){
    const first=node.arguments[0];if(first&&ts.isStringLiteralLike(first))checkModule(node,first.text,null);
   }else if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference)&&node.moduleReference.expression&&ts.isStringLiteral(node.moduleReference.expression)){
    checkModule(node,node.moduleReference.expression.text,null,Boolean(node.isTypeOnly));
   }
   if(isPure(file)){
    const expression=(ts.isCallExpression(node)||ts.isNewExpression(node))?node.expression:null;
    if(expression&&((ts.isIdentifier(expression)&&['fetch','XMLHttpRequest','WebSocket'].includes(expression.text))||
     (ts.isPropertyAccessExpression(expression)&&['fetch','sendBeacon'].includes(expression.name.text)&&['window','globalThis','navigator'].includes(expression.expression.getText(sf)))||
     (ts.isElementAccessExpression(expression)&&expression.argumentExpression&&ts.isStringLiteralLike(expression.argumentExpression)&&['fetch','sendBeacon'].includes(expression.argumentExpression.text)&&['window','globalThis','navigator'].includes(expression.expression.getText(sf)))))report(file,node,'business-io','Pure UI delegates I/O to callbacks; it cannot call network APIs.',sf);
   }
   ts.forEachChild(node,visit);
  };
  visit(sf);
 }
 // Tarjan SCC: reject cycles involving canonical implementations, including an index loop.
 let sequence=0;const indices=new Map(),low=new Map(),stack=[],active=new Set();
 const connect=file=>{
  indices.set(file,sequence);low.set(file,sequence++);stack.push(file);active.add(file);
  for(const next of edges.get(file)??[]){if(!indices.has(next)){connect(next);low.set(file,Math.min(low.get(file),low.get(next)));}else if(active.has(next))low.set(file,Math.min(low.get(file),indices.get(next)));}
  if(low.get(file)!==indices.get(file))return;
  const group=[];let next;do{next=stack.pop();active.delete(next);group.push(next);}while(next!==file);
  if((group.length>1||edges.get(file)?.has(file))&&group.some(item=>isPure(item)||item==='app/ui/index.ts')){
   violations.push({file:group.find(item=>isPure(item)||item==='app/ui/index.ts'),line:1,code:'ui-cycle',message:`UI module cycle: ${group.sort().join(' -> ')}`});
  }
 };
 for(const file of sources.keys())if(!indices.has(file))connect(file);
 return violations.sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line||a.code.localeCompare(b.code));
}

export function readUiSources(root){
 const sources=new Map();
 const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())visit(full);else if(extensions.some(ext=>entry.name.endsWith(ext)))sources.set(clean(path.relative(root,full)),fs.readFileSync(full,'utf8'));}};
 visit(path.join(root,'app'));return sources;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url)),sources=readUiSources(root),violations=auditUiArchitecture(sources);
 if(violations.length){for(const item of violations)console.error(`${item.file}:${item.line} [${item.code}] ${item.message}`);process.exitCode=1;}
 else console.log(`PASS UI architecture: ${sources.size} local modules; canonical imports, selective boundaries, pure bases and UI cycles.`);
}
