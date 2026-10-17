import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// #137 A: en móvil «Demo / probar rol / reiniciar» vive en un popup de 44 px y
// el chrome queda con una sola fila de controles (agencia, búsqueda, avisos).
test('el modo demo se abre desde un disparador móvil y los controles viven en el popup',()=>{
 const demo=read('app/demo-toolbar.tsx');
 assert.match(demo,/<div className="demo-tools relative hidden shrink-0 items-center gap-1\.5 text-\[11px\] md:flex"/,'los controles de escritorio siguen en línea');
 assert.match(demo,/<button className="demo-trigger inline-flex min-h-11[^"]*md:hidden"[^>]*aria-haspopup="dialog" aria-expanded=\{controls\} title="Controles de la demo" aria-label="Controles de la demo"/,'el disparador móvil es un botón de 44 px con semántica de diálogo');
 assert.match(demo,/<Dialog title="Tu demo" close=\{\(\)=>setControls\(false\)\}>/,'el popup móvil existe');
 const source=ts.createSourceFile('demo-toolbar.tsx',demo,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const imported=source.statements.filter(ts.isImportDeclaration).find(node=>ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text==='./ui/options-select');
 assert(imported?.importClause?.namedBindings&&ts.isNamedImports(imported.importClause.namedBindings));
 const binding=imported.importClause.namedBindings.elements.find(node=>(node.propertyName||node.name).text==='OptionsSelect');assert(binding);
 const controls:ts.JsxOpeningElement[]=[];
 function walk(node:ts.Node){if(ts.isJsxOpeningElement(node)&&node.tagName.getText(source)===binding!.name.text)controls.push(node);ts.forEachChild(node,walk);}walk(source);
 assert.equal(controls.length,2,'desktop and mobile retain their permission controls');
 for(const control of controls){
  const attrs=control.attributes.properties.filter(ts.isJsxAttribute);
  const attribute=(name:string)=>attrs.find(node=>node.name.getText(source)===name);
  assert.equal(attribute('label')?.initializer?.getText(source),'"Probar permiso"');assert(attribute('hideLabel')&&!attribute('hideLabel')!.initializer,'hidden label remains accessible');
  assert.equal(attribute('value')?.initializer?.getText(source),'{role}');assert.equal(attribute('disabled')?.initializer?.getText(source),'{busy}');
  assert.match(attribute('onChange')!.getText(source),/changeRole\(value\)/,'the new control forwards its string value to the same action');
 }
 const mobile=controls.filter(control=>{for(let p:ts.Node|undefined=control.parent;p;p=p.parent)if(ts.isJsxElement(p)&&p.openingElement.tagName.getText(source)==='Dialog'&&p.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(source)==='title'&&a.initializer?.getText(source)==='"Tu demo"'))return true;return false;});
 assert.equal(mobile.length,1,'the permission selector actually lives inside the mobile dialog');
 assert.match(demo,/const roleOptions=Object.entries\(teamRoleLabels\)\.map/,'roles still come from the shared catalog');
 assert.match(demo,/api\('\/api\/demo\/role',\{role:nextRole\}\)/,'role changes still use the authorized demo endpoint');
 assert.match(demo,/Así te ve tu cliente/,'el popup conserva la vista del cliente');
 assert.match(demo,/<a className="secondary justify-self-start" href="https:\/\/sistema\.scaleparaguay\.com\/demo" title="Reiniciar demo" aria-label="Reiniciar demo">/,'el popup conserva el reinicio con nombre accesible');
 assert.match(demo,/\{error&&<p role="alert"/,'el error se anuncia sin depender del tooltip');
});

test('el topbar móvil ya no reserva una fila para el modo demo',()=>{
 const shell=read('app/scale-workspace.tsx');
 assert.match(shell,/max-md:z-30 max-md:flex-wrap max-md:gap-2/,'el topbar móvil fluye en filas que envuelven');
 assert.doesNotMatch(shell,/workspace-topbar[^"]*max-md:grid/,'el topbar móvil dejó la grilla de tres filas');
 assert.match(shell,/className="topbar-status flex items-center gap-2 max-md:order-2"/,'los avisos van después de los controles');
 assert.doesNotMatch(shell,/max-md:col-span-full max-md:row-start-2/,'los avisos ya no fuerzan una segunda fila fija');
 assert.match(shell,/className="topbar-utility-actions[^"]*max-md:order-1/,'búsqueda, tema y notificaciones van primero en móvil');
 assert.match(shell,/className="topbar-primary flex min-w-0 flex-1 items-center gap-3 max-md:min-w-\[12\.5rem\] md:min-w-\[9rem\]"/,'la agencia tiene piso de ancho en móvil y empuja los controles a su fila');
});
