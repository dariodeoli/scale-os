/* One-time source migration. Only audited static action models are selected.
 * Uses the TypeScript AST: text inside strings/comments and specialized widgets
 * are not candidates. Business handlers, class overrides and form attrs remain. */
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const dry=process.argv.includes('--check');const report=[];
function files(d){return fs.readdirSync(d).flatMap(n=>{const p=path.join(d,n);return fs.statSync(p).isDirectory()?files(p):p.endsWith('.tsx')?[p]:[];});}
for(const file of files(path.join(root,'app'))){
 if(file.includes(`${path.sep}ui${path.sep}`))continue;
 let source=fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,99,true,4), edits=[];let buttons=0,dates=0,inputs=0,textareas=0,externalButton=false;const needed=new Set();
 const add=(start,end,text)=>edits.push({start,end,text});
 function props(node,key){return node.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(sf)===key);}
 function tag(node,name){add(node.tagName.getStart(sf),node.tagName.end,name);}
 function visit(n){
  if(ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='owncoding-ui'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)){
   const bindings=n.importClause.namedBindings.elements;
   const selected=bindings.filter(b=>['Button','Input','Textarea'].includes(b.name.text));
   if(selected.length){
    externalButton=selected.some(b=>b.name.text==='Button');for(const b of selected)needed.add(b.name.text);
    const remaining=bindings.filter(b=>!['Button','Input','Textarea'].includes(b.name.text)).map(b=>b.getText(sf));
    add(n.getStart(sf),n.end,remaining.length?`import {${remaining.join(', ')}} from 'owncoding-ui';`:'');
   }
  }
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   const name=n.tagName.getText(sf),cl=props(n,'className')?.initializer;
   if(name==='button'&&cl&&ts.isStringLiteral(cl)&&/(^| )(primary|secondary|icon-button)( |$)/.test(cl.text)){
    const classes=cl.text.split(/\s+/);const variant=classes.includes('danger')||classes.includes('record-remove')?'danger':classes.includes('primary')?'primary':'secondary';
    tag(n,'Button');if(ts.isJsxOpeningElement(n)&&ts.isJsxElement(n.parent))tag(n.parent.closingElement,'Button');
    let attrs=` variant="${variant}"`;
    if(classes.includes('icon-button'))attrs+=' iconOnly';
    // HTML buttons without type submit by default. Preserve it explicitly,
    // including portal association through FormActions.
    if(!props(n,'type'))attrs+=' type="submit"';
    add(n.tagName.end,n.tagName.end,attrs);needed.add('Button');buttons++;
   }
   if(name==='textarea'){tag(n,'Textarea');if(ts.isJsxOpeningElement(n)&&ts.isJsxElement(n.parent))tag(n.parent.closingElement,'Textarea');needed.add('Textarea');textareas++;}
   const type=props(n,'type')?.initializer;
   if(name==='input'&&type&&ts.isStringLiteral(type)&&['date','time','datetime-local'].includes(type.text)){
    const replacement={date:'DateInput',time:'TimeInput','datetime-local':'DateTimeInput'}[type.text];
    tag(n,replacement);const attr=props(n,'type');add(attr.getStart(sf),attr.end,'');needed.add(replacement);dates++;
   } else if(name==='input'&&(!type||!ts.isStringLiteral(type)||!['checkbox','radio','file','hidden','range','color'].includes(type.text))){tag(n,'Input');needed.add('Input');inputs++;}
  }
  ts.forEachChild(n,visit);
 }
 visit(sf);
 if(!edits.length)continue;
 let imports='';for(const family of [['Button'],['DateInput','TimeInput','DateTimeInput'],['Input','Textarea']]){
  const names=family.filter(n=>needed.has(n));if(!names.length)continue;
  const module=path.relative(path.dirname(file),path.join(root,'app/ui',names.includes('Button')?'button':names.some(n=>['Input','Textarea'].includes(n))?'input':'temporal-input')).split(path.sep).join('/');
  imports+=`\nimport {${names.join(', ')}} from '${module.startsWith('.')?module:'./'+module}';`;
 }
 // Import declarations may follow directives but precede other statements.
 const directive=sf.statements.find(n=>ts.isExpressionStatement(n)&&ts.isStringLiteral(n.expression)&&n.expression.text==='use client');
 add(directive?directive.end:0,directive?directive.end:0,imports+'\n');
 edits.sort((a,b)=>b.start-a.start||b.end-a.end);for(const e of edits)source=source.slice(0,e.start)+e.text+source.slice(e.end);
 if(!dry)fs.writeFileSync(file,source);
 report.push({path:path.relative(root,file),buttons,temporalInputs:dates,nativeInputs:inputs,textareas,externalButton});
}
console.log(JSON.stringify(report,null,2));
if(!dry){const target=path.join(root,'docs/ui/migration-241.json');const old=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):[];const combined=new Map(old.map(r=>[r.path,r]));for(const r of report){const prior=combined.get(r.path)||{};combined.set(r.path,{...prior,...r,buttons:(prior.buttons||0)+r.buttons,temporalInputs:(prior.temporalInputs||0)+r.temporalInputs,externalButton:prior.externalButton||r.externalButton});}fs.writeFileSync(target,JSON.stringify([...combined.values()],null,2)+'\n');}
