import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {OptionsSelect,optionsFromChildren}=require('../app/ui/options-select') as typeof import('../app/ui/options-select');
const {Selector}=require('../app/ui/select') as typeof import('../app/ui/select');

test('declarative options support arrays/fragments, text, optgroup inheritance, metadata and numeric values',()=>{
 const options=optionsFromChildren(<><option value="">Elegí</option>{[<option key="1" value={1} data-kind="entity" data-photo-url="/logo.webp" data-secondary="Plan mensual">Cliente {1}</option>]}<optgroup label="Archivados" disabled><><option value="2">Cliente <b>dos</b></option></></optgroup><optgroup label="Activos"><option disabled value="3" label="Nombre explícito">Texto alternativo</option><option>Sin valor explícito</option></optgroup>{false}{null}</>);
 assert.deepEqual(options.map(option=>[option.value,option.primary,Boolean(option.disabled),option.group]),[['','Elegí',false,undefined],['1','Cliente 1',false,undefined],['2','Cliente dos',true,'Archivados'],['3','Nombre explícito',true,'Activos'],['Sin valor explícito','Sin valor explícito',false,'Activos']]);
 assert.equal(options[1].kind,'entity');assert.equal(options[1].avatarUrl,'/logo.webp');assert.equal(options[1].secondary,'Plan mensual');
});

test('facade forwards string callbacks, real trigger identity and validation without native or hidden proxy',()=>{
 const changed:string[]=[];let renderer!:ReturnType<typeof create>;
 act(()=>{renderer=create(<OptionsSelect label="Cliente" id="quote-client" required hideLabel invalid describedBy="client-error" value="" onChange={value=>changed.push(value)}><option value="">Elegí</option><option value="7">Cliente</option></OptionsSelect>);});
 const trigger=renderer.root.findByType('button');assert.equal(trigger.props.id,'quote-client');assert.equal(trigger.props['aria-required'],true);assert.equal(trigger.props['aria-invalid'],true);assert.equal(trigger.props['aria-describedby'],'client-error');assert.equal(trigger.props.type,'button');
 assert.equal(renderer.root.findAllByType('select').length,0);assert.equal(renderer.root.findAllByType('input').length,0,'no FormData proxy');
 act(()=>renderer.root.findByType(Selector).props.onChange('7'));assert.deepEqual(changed,['7']);assert.equal(renderer.root.findByType(Selector).props.value,'','caller owns state');act(()=>renderer.unmount());
});

test('all application select consumers use explicit controlled local facade; no native/ref/event dependency remains',()=>{
 const fs=require('node:fs') as typeof import('node:fs'),path=require('node:path') as typeof import('node:path'),ts=require('typescript') as typeof import('typescript');
 const walk=(directory:string):string[]=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):entry.name.endsWith('.tsx')?[path.join(directory,entry.name)]:[]);
 const native:string[]=[],external:string[]=[];let consumers=0;
 for(const file of walk(path.resolve('app'))){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),aliases=new Set<string>();
  for(const node of source.statements){if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier))continue;const bindings=node.importClause?.namedBindings;if(!bindings||!ts.isNamedImports(bindings))continue;
   for(const binding of bindings.elements){const exported=(binding.propertyName??binding.name).text;if(node.moduleSpecifier.text==='owncoding-ui'&&exported==='Select')external.push(file);if(node.moduleSpecifier.text.endsWith('/options-select')&&exported==='OptionsSelect')aliases.add(binding.name.text);}}
  const visit=(node:import('typescript').Node)=>{if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){const tag=node.tagName.getText(source);if(tag==='select')native.push(file);if(aliases.has(tag)){consumers++;const attributes=node.attributes.properties.filter(ts.isJsxAttribute);for(const name of ['label','value','onChange'])assert(attributes.some(attribute=>attribute.name.getText(source)===name),`${file} missing ${name}`);assert(!attributes.some(attribute=>attribute.name.getText(source)==='ref'),`${file} assumes native select ref`);const callback=attributes.find(attribute=>attribute.name.getText(source)==='onChange');assert(!callback?.getText(source).includes('target.value'),`${file} assumes select event`);}}ts.forEachChild(node,visit);};visit(source);
 }
 assert.deepEqual(native,[]);assert.deepEqual(external,[]);assert(consumers>=27,`expected migrated coverage, got ${consumers}`);
});
