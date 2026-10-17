import ts from 'typescript';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Transform syntax only: events, values, validation and business callbacks stay intact. */
export function migrateFieldSource(source,file){
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],imports=new Map(),amountNames=new Set();
 const counts={nativeInput:0,nativeTextarea:0,dependencyInput:0,dependencyTextarea:0,dependencyAmount:0};
 const relative=target=>{const value=path.posix.relative(path.posix.dirname(file),target);return value.startsWith('.')?value:'./'+value;};
 const add=(target,binding)=>{const set=imports.get(target)||new Set();set.add(binding);imports.set(target,set);};
 const names=new Set();
 for(const statement of sf.statements){
  if(!ts.isImportDeclaration(statement))continue;
  const bindings=statement.importClause?.namedBindings;
  if(!bindings||!ts.isNamedImports(bindings))continue;
  for(const element of bindings.elements)names.add(element.name.text);
  if(statement.moduleSpecifier.text!=='owncoding-ui')continue;
  const kept=[];
  for(const element of bindings.elements){
   const original=(element.propertyName||element.name).text,local=element.name.text;
   if(original==='Input'){add('app/ui/input-control',`InputControl as ${local}`);counts.dependencyInput++;}
   else if(original==='Textarea'){add('app/ui/input',`TextareaBase as ${local}`);counts.dependencyTextarea++;}
   else if(original==='MoneyInput'){add('app/ui/amount',`AmountInput as ${local}`);amountNames.add(local);counts.dependencyAmount++;}
   else kept.push(element.getText(sf));
  }
  if(kept.length!==bindings.elements.length){
   if(statement.importClause?.name)throw new Error(`Review default import before migration: ${file}`);
   edits.push([statement.getStart(sf),statement.end,kept.length?`import {${kept.join(',')}} from 'owncoding-ui';`:'']);
  }
 }
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)||ts.isJsxClosingElement(node)){
   const tag=node.tagName.getText(sf);
   if(tag==='input'){
    edits.push([node.tagName.getStart(sf),node.tagName.end,'InputControl']);
    if(!ts.isJsxClosingElement(node))counts.nativeInput++;
    if(!names.has('InputControl'))add('app/ui/input-control','InputControl');
   }else if(tag==='textarea'){
    edits.push([node.tagName.getStart(sf),node.tagName.end,'TextareaBase']);
    if(!ts.isJsxClosingElement(node))counts.nativeTextarea++;
    if(!names.has('TextareaBase'))add('app/ui/input','TextareaBase');
   }
   if(amountNames.has(tag)&&!ts.isJsxClosingElement(node))for(const attr of node.attributes.properties){
    if(!ts.isJsxAttribute(attr))continue;
    if(attr.name.text==='onValueChange')edits.push([attr.name.getStart(sf),attr.name.end,'onChange']);
    // Currency symbol is a single presentation policy of AmountInput. No FX.
    if(attr.name.text==='symbol')edits.push([attr.getStart(sf),attr.end,'']);
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(sf);
 if(!edits.length)return {source,counts};
 let output=source;
 for(const[start,end,replacement]of edits.sort((a,b)=>b[0]-a[0]))output=output.slice(0,start)+replacement+output.slice(end);
 const importText=[...imports].map(([target,bindings])=>`import {${[...bindings].join(',')}} from '${relative(target)}';`).join('\n');
 // Keep the directive prologue first (and original comments/imports intact).
 const directive=sf.statements.find(statement=>ts.isExpressionStatement(statement)&&ts.isStringLiteral(statement.expression)&&statement.expression.text==='use client');
 if(directive)output=output.slice(0,directive.end)+'\n'+importText+output.slice(directive.end);
 else output=importText+'\n'+output;
 return {source:output,counts};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const write=process.argv.includes('--write'),report=[];
 for(const relative of readdirSync('app',{recursive:true}).filter(file=>file.endsWith('.tsx')&&!file.startsWith('ui/'))){
  const file=`app/${relative}`,before=readFileSync(file,'utf8'),result=migrateFieldSource(before,file);
  if(result.source!==before){report.push({file,...result.counts});if(write)writeFileSync(file,result.source);}
 }
 console.log(JSON.stringify({write,files:report.length,report},null,2));
}
