import ts from 'typescript';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const targets={Card:['surface','CardSurface'],DataTable:['collection','DataTable'],FormField:['field','FormField'],Label:['field','FieldLabel'],Aviso:['notice','Notice'],Nota:['notice','Note'],SegmentedField:['navigation','SegmentedField'],Subtabs:['navigation','Subtabs'],EmptyState:['../ui-v2','EmptyBlock'],ErrorState:['../ui-v2','ErrorBlock']};
/** Only redirect reviewed presentation bindings; callbacks and JSX stay byte-for-byte. */
export function migrateSurfaceImports(source,file){
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],imports=new Map(),counts={};
 for(const statement of sf.statements){
  if(!ts.isImportDeclaration(statement)||statement.moduleSpecifier.text!=='owncoding-ui')continue;
  const bindings=statement.importClause?.namedBindings;if(!bindings||!ts.isNamedImports(bindings))continue;
  const kept=[];
  for(const element of bindings.elements){
   const name=(element.propertyName||element.name).text,target=targets[name];
   if(!target||(file==='app/ui-v2.tsx'&&['EmptyState','ErrorState'].includes(name))){kept.push(element.getText(sf));continue;}
   const destination=path.posix.normalize('app/ui/'+target[0]);
   let relative=path.posix.relative(path.posix.dirname(file),destination);if(!relative.startsWith('.'))relative='./'+relative;
   const list=imports.get(relative)||[];list.push(target[1]===element.name.text?target[1]:`${target[1]} as ${element.name.text}`);imports.set(relative,list);counts[name]=(counts[name]||0)+1;
  }
  if(kept.length!==bindings.elements.length){
   if(statement.importClause.name)throw Error(`Default import needs review: ${file}`);
   edits.push([statement.getStart(sf),statement.end,kept.length?`import {${kept.join(',')}} from 'owncoding-ui';`:'']);
  }
 }
 let output=source;for(const[a,b,text]of edits.sort((a,b)=>b[0]-a[0]))output=output.slice(0,a)+text+output.slice(b);
 if(edits.length){const additions=[...imports].map(([from,names])=>`import {${names.join(',')}} from '${from}';`).join('\n');const directive=sf.statements.find(n=>ts.isExpressionStatement(n)&&ts.isStringLiteral(n.expression)&&n.expression.text==='use client');const at=directive?.end||0;output=output.slice(0,at)+'\n'+additions+'\n'+output.slice(at);}
 return {source:output,counts};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const write=process.argv.includes('--write'),report=[];
 for(const relative of readdirSync('app',{recursive:true}).filter(p=>p.endsWith('.tsx')&&!p.startsWith('ui/'))){const file='app/'+relative,before=readFileSync(file,'utf8'),result=migrateSurfaceImports(before,file);if(before!==result.source){if(write)writeFileSync(file,result.source);report.push({file,...result.counts});}}
 console.log(JSON.stringify({write,files:report.length,report},null,2));
}
