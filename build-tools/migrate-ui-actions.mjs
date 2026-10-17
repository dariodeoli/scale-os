#!/usr/bin/env node
/** Local source only; never loads UI packages or changes dependencies.
 * node build-tools/migrate-ui-actions.mjs --audit --report=/tmp/actions.json
 * node build-tools/migrate-ui-actions.mjs --dry-run app/example.tsx
 * node build-tools/migrate-ui-actions.mjs --write app/example.tsx --report=/tmp/actions.json
 * Optional --fallback-variant=ghost is a human-reviewed choice, not a class guess.
 * --manifest=docs/audits/241-ui-actions-reviewed.json applies exact source/site reviews.
 * --write rejects any unreviewed manual/structural site in selected files.
 * Review every report site: migrate / structural / manual / renderer / canonical.
 * Structural sites retain native anatomy; manual sites are NOT accepted exceptions.
 * Root must review widgets and IconAction mappings, re-audit the final SHA and run
 * consumer/browser tests. This tool is not a claim of zero remaining action bypasses.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createHash} from 'node:crypto';

const variants=new Set(['primary','secondary','outline','ghost','danger']);
const structuralRoles=new Set(['tab','option','menuitem','menuitemcheckbox','menuitemradio','checkbox','radio','switch','combobox','treeitem']);
const structuralFunctions=new Set(['PlainSelect','PersonSelect','SelectCustom','AssigneePicker','EntityPicker','ActionMenu','EdgeAwareMenu','PhotoCropper','PhotoViewer','ProfilePhoto','PhotoField','ThemeToggle','ViewTabs','ViewSwitch','TabScroller']);
const stableExpression=node=>!!node&&(ts.isIdentifier(node)||ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node)||ts.isStringLiteral(node)||ts.isTemplateExpression(node)||ts.isNoSubstitutionTemplateLiteral(node));
const attr=(node,name)=>node.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.getText()===name);
const literal=node=>node&&ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer)?node.initializer.text:undefined;
function enclosingFunction(node){for(let p=node.parent;p;p=p.parent){if((ts.isFunctionDeclaration(p)||ts.isFunctionExpression(p))&&p.name)return p.name.text;if(ts.isVariableDeclaration(p)&&ts.isIdentifier(p.name))return p.name.text;}return '';}
function commentsOnly(text){const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.JSX,text);let out='';for(let token=scanner.scan();token!==ts.SyntaxKind.EndOfFileToken;token=scanner.scan())if(token===ts.SyntaxKind.SingleLineCommentTrivia||token===ts.SyntaxKind.MultiLineCommentTrivia)out+=scanner.getTokenText()+'\n';return out;}
function optionReason(open){const role=literal(attr(open,'role'));
 if(attr(open,'role')&&role===undefined)return 'dynamic role; preserve widget semantics until reviewed';if(structuralRoles.has(role))return `semantic role=${role}; preserve widget anatomy and keyboard model`;
 for(const name of ['aria-haspopup','aria-expanded','aria-selected','aria-checked','data-state'])if(attr(open,name))return `widget state ${name}; canonical trigger/option requires manual ownership`;
 const owner=enclosingFunction(open);if(structuralFunctions.has(owner))return `canonical internal ${owner}; preserve geometry, focus and widget behavior`;
 return null;}
function childrenOf(open){return ts.isJsxElement(open.parent)?open.parent.children:[];}
function iconOnly(open,iconBindings){const children=childrenOf(open).filter(c=>!(ts.isJsxText(c)&&!c.text.trim())&&!(ts.isJsxExpression(c)&&!c.expression));return children.length===1&&((ts.isJsxSelfClosingElement(children[0])&&(children[0].tagName.getText()==='svg'||iconBindings.has(children[0].tagName.getText())))||(ts.isJsxElement(children[0])&&children[0].openingElement.tagName.getText()==='svg'));}
function accessibleName(open){const label=attr(open,'aria-label');if(!label?.initializer)return null;if(ts.isStringLiteral(label.initializer)&&label.initializer.text.trim())return label.initializer.getText();if(ts.isJsxExpression(label.initializer)&&stableExpression(label.initializer.expression))return label.initializer.getText();return null;}

/** Returns text edits and an exhaustive classification for all action sites in one TSX. */
export function analyzeActions(source,{file='app/example.tsx',fallbackVariant,root=process.cwd(),review}={}){
 if(fallbackVariant&&!variants.has(fallbackVariant))throw Error('Unknown fallback variant');
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(sf.parseDiagnostics.length)throw Error(`Invalid TSX: ${file}`);
 const hash=value=>createHash('sha256').update(value).digest('hex');
 if(review&&review.sourceHash!==hash(source))throw Error(`Stale review file hash: ${file}`);
 const reviewEntries=new Map((review?.sites||[]).map(item=>[`${item.line}:${item.column}`,item]));
 if(reviewEntries.size!==(review?.sites.length||0))throw Error(`Duplicate review site: ${file}`);
 const consumedReviews=new Set(),iconMoves=new Set(),iconRecords=new Map(),extraIcons=new Map();
 const sites=[],edits=[],legacy=new Map(),canonicalBindings=new Set(),namespaceBindings=new Set(),iconActions=new Set(),iconBindings=new Set(),names=new Set();let localButton,localIcon;
 const canonical=path.resolve(root,'app/ui/button.tsx')===path.resolve(root,file);
 const localModule=(()=>{let relative=path.relative(path.dirname(path.resolve(root,file)),path.resolve(root,'app/ui/button')).replaceAll(path.sep,'/');return relative.startsWith('.')?relative:'./'+relative;})();
 function collect(node){if(ts.isIdentifier(node))names.add(node.text);ts.forEachChild(node,collect);}collect(sf);
 const fresh=base=>{let result=base;for(let i=2;names.has(result);i++)result=base+i;names.add(result);return result;};
 const imports=sf.statements.filter(ts.isImportDeclaration);
 for(const statement of imports){const module=statement.moduleSpecifier.text;const bindings=statement.importClause?.namedBindings;
  if(bindings&&ts.isNamespaceImport(bindings)&&(module==='owncoding-ui'||module==='owncoding-ui/core'))namespaceBindings.add(bindings.name.text);
  if(!bindings||!ts.isNamedImports(bindings))continue;
  for(const spec of bindings.elements){const imported=(spec.propertyName||spec.name).text;
   if((module==='owncoding-ui'||module==='owncoding-ui/core')&&imported==='Button')legacy.set(spec.name.text,{statement,spec});
   if((module==='owncoding-ui'||module==='owncoding-ui/core')&&imported==='IconAction'){iconActions.add(spec.name.text);iconRecords.set(spec.name.text,{statement,spec});}
   if(module.startsWith('.')&&((['Button','IconButton'].includes(imported)&&[path.resolve(root,'app/ui'),path.resolve(root,'app/ui/index'),path.resolve(root,'app/ui/button')].includes(path.resolve(path.dirname(path.resolve(root,file)),module)))||(imported==='IconAction'&&path.resolve(root,'app/ui/icon-action')===path.resolve(path.dirname(path.resolve(root,file)),module))))canonicalBindings.add(spec.name.text);
   if(module==='lucide-react')iconBindings.add(spec.name.text);
   if(module===localModule&&imported==='Button')localButton=spec.name.text;
   if(module===localModule&&imported==='IconButton')localIcon=spec.name.text;
  }
 }
 const buttonName=()=>localButton||(localButton=fresh('ScaleButton'));
 const iconName=()=>localIcon||(localIcon=fresh('ScaleIconButton'));
 function replaceTag(open,name){edits.push({start:open.tagName.getStart(sf),end:open.tagName.end,text:name});if(ts.isJsxElement(open.parent))edits.push({start:open.parent.closingElement.tagName.getStart(sf),end:open.parent.closingElement.tagName.end,text:name});}
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const name=node.tagName.getText(sf);const namespaceAction=ts.isPropertyAccessExpression(node.tagName)&&namespaceBindings.has(node.tagName.expression.getText(sf))&&['Button','IconAction'].includes(node.tagName.name.text);
   if(name==='button'||legacy.has(name)||iconActions.has(name)||canonicalBindings.has(name)||namespaceAction){
    const pos=sf.getLineAndCharacterOfPosition(node.getStart(sf));const site={file,line:pos.line+1,column:pos.character+1,offset:node.getStart(sf),kind:name==='button'?'native':legacy.has(name)?'imported-button':canonicalBindings.has(name)?'canonical-button':namespaceAction?'namespace-action':'icon-action',owner:enclosingFunction(node),status:'manual',reason:'',type:literal(attr(node,'type'))??(attr(node,'type')?'expression':'omitted')};sites.push(site);
    const decision=reviewEntries.get(`${site.line}:${site.column}`);
    if(decision){
     const full=ts.isJsxOpeningElement(node)?node.parent:node;
     if(decision.siteHash!==hash(full.getText(sf)))throw Error(`Stale review site hash: ${file}:${site.line}`);
     if(!decision.rationale||!['retain','action','facade'].includes(decision.action))throw Error(`Invalid review decision: ${file}:${site.line}`);
     if(decision.action!=='facade'&&name!=='button')throw Error('Native action/structural review requires a native button');
     if(decision.target&&!['Button','IconButton'].includes(decision.target))throw Error('Invalid reviewed target');
     if(decision.action==='retain'&&!decision.canonical)throw Error('Structural review requires canonical owner');
     consumedReviews.add(decision);site.reviewed=true;site.canonical=decision.canonical;site.reason=decision.rationale;
    }
    const reviewedAction=decision?.action==='action';
    if(decision?.action==='retain'){site.status='structural';}
    else if(decision?.action==='facade'){
     if(!iconActions.has(name))throw Error('Facade review only supports existing IconAction bindings');
     site.status='migrate';iconMoves.add(name);
    }
    else if(canonicalBindings.has(name)){site.status='canonical';site.reason='existing local action facade';}
    else if(namespaceAction){site.reason='namespace action import requires explicit binding migration';}
    else if(name!=='button'){site.status=legacy.has(name)?'migrate':'manual';site.reason=legacy.has(name)?'existing Button named import -> local compatible facade; attributes and children untouched':'IconAction string/dynamic icon and tone require explicit local ReactNode mapping; no external implementation inspected';}
    else if(canonical){site.status='renderer';site.reason='single canonical native Button renderer';}
    else if(!reviewedAction&&optionReason(node)){site.status='structural';site.reason=optionReason(node);}
    else if(node.attributes.properties.some(ts.isJsxSpreadAttribute)){site.reason='spread may supply type, role, className or labels; review before migration';}
    else{
     const classAttribute=attr(node,'className'),className=literal(classAttribute);
     const tokens=new Set(className?.split(/\s+/).filter(Boolean));const mappings=[['primary','primary'],['secondary','secondary'],['text-button','ghost'],['danger','danger']].filter(([token])=>tokens.has(token));
     const classesDynamic=!!classAttribute&&className===undefined;
     const variant=decision?.variant||(mappings.length===1?mappings[0][1]:fallbackVariant);
     if(!reviewedAction&&mappings.length>1&&!fallbackVariant)site.reason='conflicting legacy action classes; select explicit fallback after review';
     else if(!variant)site.reason=classesDynamic?'dynamic className retained; requires explicit --fallback-variant':'no unambiguous action variant; requires explicit --fallback-variant';
     else if(attr(node,'variant')||attr(node,'color')||attr(node,'loading')||attr(node,'size')||attr(node,'icon')||attr(node,'iconPosition')||attr(node,'fullWidth'))site.reason='native attribute collides with facade API; review semantic compatibility';
     else{
      const label=accessibleName(node)||(reviewedAction?attr(node,'aria-label')?.initializer?.getText(sf):null);const isIcon=decision?.target==='IconButton'||(!decision?.target&&iconOnly(node,iconBindings));
      if(isIcon&&!label){site.reason='icon-only action lacks stable aria-label; preserve source and review accessible name';}
      else{
       site.status='migrate';if(!decision)site.reason=isIcon?'single decorative icon with existing stable aria-label':'action with explicit legacy or reviewed fallback variant';site.variant=variant;
       replaceTag(node,isIcon?iconName():buttonName());
       if(!variants.has(variant))throw Error('Invalid reviewed variant');
       let props=decision?.variantExpression?` variant={${checkedExpression(decision.variantExpression,variants)}}`:` variant="${variant}"`;
       if(decision?.color){if(!['brand','neutral','success','warning','danger'].includes(decision.color))throw Error('Invalid reviewed color');props+=` color="${decision.color}"`;}
       if(decision?.colorExpression)props+=` color={${checkedExpression(decision.colorExpression,new Set(['brand','neutral','success','warning','danger']))}}`;
       if(decision?.size){if(!['compact','medium','large'].includes(decision.size))throw Error('Invalid reviewed size');props+=` size="${decision.size}"`;}
       edits.push({start:node.attributes.end,end:node.attributes.end,text:props});
       if(isIcon){const ariaLabel=attr(node,'aria-label');edits.push({start:ariaLabel.name.getStart(sf),end:ariaLabel.name.end,text:'label'});
        let content=childrenOf(node).map(c=>c.getText(sf)).join('');
        if(decision?.iconExport){if(decision.iconExport!=='X')throw Error('Only explicitly reviewed X glyph replacement is supported');let binding=extraIcons.get('X');if(!binding){binding=fresh('ActionIconX');extraIcons.set('X',binding);}content=`<${binding}/>`;}
        // IconButton's icon prop must preserve the actual JSX, never guess a glyph.
        edits.push({start:node.attributes.end,end:node.attributes.end,text:` icon={<>${content}</>}`});
        edits.push({start:node.end,end:node.parent.closingElement.getStart(sf),text:''});
       }
      }
     }
    }
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(sf);
 if(consumedReviews.size!==reviewEntries.size)throw Error(`Review site disappeared: ${file}`);
 // Imported Button aliases retain their local names and all JSX props verbatim.
 function moveImport({statement,spec},exported,destination){
  const elements=statement.importClause.namedBindings.elements;
  if(elements.length===1&&!statement.importClause.name){edits.push({start:statement.moduleSpecifier.getStart(sf),end:statement.moduleSpecifier.end,text:JSON.stringify(destination)});return;}
  edits.push({start:spec.getStart(sf),end:spec.end,text:commentsOnly(spec.getText(sf))});
  const tokens=statement.importClause.namedBindings.getChildren(sf).find(n=>n.kind===ts.SyntaxKind.SyntaxList).getChildren(sf);
  const index=tokens.indexOf(spec);const comma=tokens[index+1]?.kind===ts.SyntaxKind.CommaToken?tokens[index+1]:tokens[index-1];
  if(comma?.kind===ts.SyntaxKind.CommaToken)edits.push({start:comma.getStart(sf),end:comma.end,text:''});
  edits.push({start:statement.end,end:statement.end,text:`\nimport {${exported}${spec.name.text===exported?'':` as ${spec.name.text}`}} from ${JSON.stringify(destination)};`});
 }
 for(const record of legacy.values())moveImport(record,'Button',localModule);
 for(const name of iconMoves){if(sites.some(site=>site.kind==='icon-action'&&site.status!=='migrate'))throw Error(`All IconAction sites in a file require review: ${file}`);moveImport(iconRecords.get(name),'IconAction',localModule.replace(/button$/,'icon-action'));}
 const added=[];
 if(localButton&&!imports.some(i=>i.moduleSpecifier.text===localModule&&i.importClause?.namedBindings&&ts.isNamedImports(i.importClause.namedBindings)&&i.importClause.namedBindings.elements.some(e=>e.name.text===localButton)))added.push(`Button as ${localButton}`);
 if(localIcon&&!imports.some(i=>i.moduleSpecifier.text===localModule&&i.importClause?.namedBindings&&ts.isNamedImports(i.importClause.namedBindings)&&i.importClause.namedBindings.elements.some(e=>e.name.text===localIcon)))added.push(`IconButton as ${localIcon}`);
 if(added.length){const start=imports.at(-1)?.end??(sf.statements[0]&&ts.isExpressionStatement(sf.statements[0])&&ts.isStringLiteral(sf.statements[0].expression)?sf.statements[0].end:0);edits.push({start,end:start,text:`\nimport {${added.join(', ')}} from ${JSON.stringify(localModule)};\n`});}
 if(extraIcons.size){const start=imports.at(-1)?.end??0;edits.push({start,end:start,text:`\nimport {${[...extraIcons].map(([name,alias])=>`${name} as ${alias}`).join(', ')}} from 'lucide-react';\n`});}
 const uniqueEdits=[...new Map(edits.map(edit=>[`${edit.start}:${edit.end}:${edit.text}`,edit])).values()];
 let previousEnd=-1;for(const edit of uniqueEdits.filter(e=>e.end>e.start).sort((a,b)=>a.start-b.start)){if(edit.start<previousEnd)throw Error(`Overlapping edits require manual review: ${file}`);previousEnd=edit.end;}
 let output=source;for(const edit of uniqueEdits.sort((a,b)=>b.start-a.start||b.end-a.end))output=output.slice(0,edit.start)+edit.text+output.slice(edit.end);
 const parsed=ts.createSourceFile(file,output,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);if(parsed.parseDiagnostics.length)throw Error(`Generated TSX is invalid: ${file}`);
 return {source:output,changed:output!==source,sites};
}

function checkedExpression(text,values){
 const sf=ts.createSourceFile('review.ts',`const value=(${text});`,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(sf.parseDiagnostics.length||sf.statements.length!==1)throw Error('Invalid reviewed expression');
 const root=sf.statements[0].declarationList.declarations[0].initializer;
 function check(node){if(!(ts.isParenthesizedExpression(node)||ts.isConditionalExpression(node)||ts.isPropertyAccessExpression(node)||ts.isIdentifier(node)||ts.isStringLiteral(node)||ts.isNumericLiteral(node)||ts.isBinaryExpression(node)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword,ts.SyntaxKind.QuestionToken,ts.SyntaxKind.ColonToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.kind)))throw Error('Reviewed expression must be pure data/conditional, without calls or assignments');ts.forEachChild(node,check);}
 check(root);
 function output(node){if(ts.isParenthesizedExpression(node))return output(node.expression);if(ts.isConditionalExpression(node)){output(node.whenTrue);output(node.whenFalse);return;}if(!ts.isStringLiteral(node)||!values.has(node.text))throw Error('Reviewed expression must return a controlled semantic value');}
 output(root);return text;
}
function filesUnder(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isSymbolicLink()?[]:entry.isDirectory()?filesUnder(path.join(directory,entry.name)):entry.name.endsWith('.tsx')?[path.join(directory,entry.name)]:[]).sort();}
export function runMigration({root=process.cwd(),files,write=false,fallbackVariant,report,manifest}={}){
 if(write&&!files?.length)throw Error('--write requires an explicit file list; migrate sequentially');
 const reviewed=manifest?(typeof manifest==='string'?JSON.parse(fs.readFileSync(path.resolve(root,manifest),'utf8')):manifest):null;
 if(reviewed&&(reviewed.schema!==1||!Array.isArray(reviewed.files)))throw Error('Unsupported review manifest');
 const records=new Map((reviewed?.files||[]).map(record=>[record.file,record]));if(records.size!==(reviewed?.files.length||0))throw Error('Duplicate manifest file');
 const selected=[...new Set(files?.length?files.map(file=>path.resolve(root,file)):filesUnder(path.join(root,'app')))];
 const plans=selected.map(absolute=>{if(!absolute.startsWith(path.resolve(root,'app')+path.sep)||!fs.realpathSync(absolute).startsWith(fs.realpathSync(path.resolve(root,'app'))+path.sep)||!absolute.endsWith('.tsx'))throw Error('Only app/**/*.tsx may be selected');const source=fs.readFileSync(absolute,'utf8');return {absolute,before:source,...analyzeActions(source,{file:path.relative(root,absolute).replaceAll(path.sep,'/'),root,fallbackVariant,review:records.get(path.relative(root,absolute).replaceAll(path.sep,'/'))})};});
 if(report&&(!report.endsWith('.json')||path.resolve(root,report).startsWith(path.resolve(root,'app')+path.sep)))throw Error('Report must be a .json file outside app/');
 if(report&&fs.existsSync(path.resolve(root,report))){let previous;try{previous=JSON.parse(fs.readFileSync(path.resolve(root,report),'utf8'));}catch{}if(previous?.tool!=='scale-ui-actions')throw Error('Refusing to overwrite an unrelated report path');}
 const result={tool:'scale-ui-actions',mode:write?'write':'audit',fallbackVariant:fallbackVariant??null,counts:{},files:plans.map(p=>({file:path.relative(root,p.absolute),changed:p.changed,sha256:createHash('sha256').update(p.before).digest('hex')})),sites:plans.flatMap(p=>p.sites)};
 result.unreviewed=result.sites.filter(site=>site.status==='manual'||(site.status==='structural'&&!site.reviewed)).length;
 if(write&&result.unreviewed)throw Error(`${result.unreviewed} UNREVIEWED sites; refusing all writes`);
 for(const site of result.sites)result.counts[site.status]=(result.counts[site.status]||0)+1;
 if(write){for(const p of plans)if(fs.readFileSync(p.absolute,'utf8')!==p.before)throw Error(`Source changed during planning: ${p.absolute}`);for(const p of plans)if(p.changed)fs.writeFileSync(p.absolute,p.source);}
 if(report)fs.writeFileSync(path.resolve(root,report),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{let write=false,audit=false,report,fallbackVariant,manifest;const files=[];for(const arg of process.argv.slice(2)){if(arg==='--write')write=true;else if(arg==='--audit'||arg==='--dry-run')audit=true;else if(arg.startsWith('--manifest='))manifest=arg.slice(11);else if(arg.startsWith('--report='))report=arg.slice(9);else if(arg.startsWith('--fallback-variant='))fallbackVariant=arg.slice(19);else if(arg.startsWith('--'))throw Error(`Unknown flag: ${arg}`);else files.push(arg);}if(write&&audit)throw Error('--write cannot be combined with --audit/--dry-run');const result=runMigration({write,report,fallbackVariant,files,manifest});console.log(JSON.stringify(report?{mode:result.mode,counts:result.counts,unreviewed:result.unreviewed,files:result.files,report}:result,null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
