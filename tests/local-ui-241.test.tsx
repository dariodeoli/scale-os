import React,{useState} from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create} from 'react-test-renderer';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {Button}=require('../app/ui/button') as typeof import('../app/ui/button');
const {DateInput,TimeInput,DateTimeInput}=require('../app/ui/temporal-input') as typeof import('../app/ui/temporal-input');

test('action primitive preserves form association, refs, labels, handlers and pending state',()=>{
 let count=0;const ref=React.createRef<HTMLButtonElement>(),dom={focus(){}};
 const view=create(<Button ref={ref} form="editor" type="submit" aria-label="Guardar ficha" onClick={()=>count++} icon={<span/>}>Guardar</Button>,{createNodeMock:()=>dom});
 assert.equal(ref.current,dom);let el=view.root.findByType('button');
 assert.equal(el.props.form,'editor');assert.equal(el.props.type,'submit');assert.equal(el.props['aria-label'],'Guardar ficha');
 act(()=>el.props.onClick());assert.equal(count,1);
 act(()=>view.update(<Button loading disabled={false} type="submit" form="editor">Guardar</Button>));
 el=view.root.findByType('button');assert.equal(el.props.disabled,true);assert.equal(el.props['aria-busy'],true);assert.equal(el.props.form,'editor');
 act(()=>view.update(<Button variant="danger" size="compact" iconOnly aria-label="Eliminar"/>));
 el=view.root.findByType('button');assert.equal(el.props.type,'button');assert.equal(el.props['data-size'],'compact');assert.match(el.props.className,/danger/);assert.match(el.props.className,/icon-button/);
 view.unmount();
});

test('temporal primitives retain native editing contract without timezone conversion or mounting callbacks',()=>{
 let changes=0;const ref=React.createRef<HTMLInputElement>(),dom={focus(){}};
 const view=create(<DateInput ref={ref} value="2026-10-17" min="2026-01-01" max="2026-12-31" aria-invalid onChange={()=>changes++}/>,{createNodeMock:()=>dom});
 assert.equal(ref.current,dom);let input=view.root.findByType('input');assert.equal(input.props.type,'date');assert.equal(input.props.value,'2026-10-17');assert.equal(input.props.min,'2026-01-01');assert.equal(changes,0);
 act(()=>view.update(<TimeInput value="23:59" step={60} disabled onChange={()=>changes++}/>));input=view.root.findByType('input');assert.equal(input.props.type,'time');assert.equal(input.props.value,'23:59');assert.equal(input.props.disabled,true);
 act(()=>view.update(<DateTimeInput value="2026-10-17T23:59" onChange={()=>changes++}/>));input=view.root.findByType('input');assert.equal(input.props.type,'datetime-local');assert.equal(input.props.value,'2026-10-17T23:59');assert.equal(changes,0);
 view.unmount();
});

test('audited migration preserves button/form/field contract for every transformed source',()=>{
 const rows=JSON.parse(readFileSync('docs/ui/migration-241.json','utf8')) as {path:string;buttons:number;temporalInputs:number;externalButton:boolean}[];
 assert(rows.length>70);assert(rows.reduce((a,r)=>a+r.buttons,0)>=241);
 for(const row of rows){
  const text=readFileSync(row.path,'utf8'),sf=ts.createSourceFile(row.path,text,99,true,4);let rawModeled=0;
  const visit=(n:ts.Node)=>{if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   const tag=n.tagName.getText(sf),attrs=n.attributes.properties;
   const field=attrs.find(p=>ts.isJsxAttribute(p)&&p.name.getText(sf)==='className') as ts.JsxAttribute|undefined;
   if(tag==='button'&&field?.initializer&&ts.isStringLiteral(field.initializer)&&/(^| )(primary|secondary|icon-button)( |$)/.test(field.initializer.text))rawModeled++;
  }ts.forEachChild(n,visit);};visit(sf);assert.equal(rawModeled,0,row.path);
  if(row.externalButton)assert.match(text,/from ['"]\.\.?\/.*ui\/button['"]/,row.path);
 }
});

test('catalog is opt-in and excludes data APIs and commercial side effects',()=>{
 const page=readFileSync('app/ui-catalog/page.tsx','utf8');assert.match(page,/SCALE_UI_CATALOG !== '1'/);assert.match(page,/notFound\(\)/);
 const sample=readFileSync('app/ui-catalog/ui-catalog.tsx','utf8');assert(!sample.includes('fetch('));assert(!sample.includes('/api/'));assert(sample.includes('Formulario ilustrativo'));
});
