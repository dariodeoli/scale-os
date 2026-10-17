import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
import {families} from '../app/biblioteca-ui/catalog-data';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};

test('catalog covers eight families and every example documents props, use, misuse and domain boundary',()=>{
 assert.equal(families.length,8);const examples=families.flatMap(family=>family.examples);assert.equal(examples.length,26);assert.equal(new Set(examples.map(example=>example.id)).size,26);
 for(const example of examples){for(const field of ['name','description','correct','incorrect','reuse','boundary'] as const)assert(example[field].trim().length>0,`${example.id}: ${field}`);assert(example.props.length>=2);for(const prop of example.props)assert(prop.every(Boolean));}
 assert.match(readFileSync('app/biblioteca-ui/page.tsx','utf8'),/robots:\{index:false,follow:false\}/);
});

test('catalog imports only public UI components and never creates native actions, provider calls or a second toast viewport',()=>{
 for(const name of readdirSync('app/biblioteca-ui').filter(name=>/\.tsx?$/.test(name))){const path='app/biblioteca-ui/'+name,source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const visit=(node:ts.Node)=>{
   if(ts.isImportDeclaration(node)){const module=(node.moduleSpecifier as ts.StringLiteral).text;assert(['react','lucide-react','next','../ui','./catalog-data','./catalog','./catalog.css'].includes(module),`unexpected dependency ${module}`);}
   if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))assert(!['button','select','input','textarea','ToastViewport','NotificationCenter'].includes(node.tagName.getText(source)),`duplicate UI model in ${path}`);
   if(ts.isCallExpression(node))assert(!/(^|\.)(fetch|api|XMLHttpRequest|WebSocket|EventSource)$/.test(node.expression.getText(source)),`unexpected network call in ${path}`);
   if(ts.isPropertyAccessExpression(node))assert(!['localStorage','sessionStorage','cookie'].includes(node.name.text),`unexpected persistence in ${path}`);
   ts.forEachChild(node,visit);
  };visit(source);
 }
});

test('temporary catalog theme restores the exact previous root attribute without persistence',()=>{
 const uiPath=require.resolve('../app/ui'),oldUi=require.cache[uiPath],oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const Fallback=({children}:{children?:React.ReactNode|((props:unknown)=>React.ReactNode)})=><>{typeof children==='function'?null:children}</>;
 const OptionsSelect=Fallback;
 const exports=new Proxy({PageHeader:({actions}:{actions:React.ReactNode})=><>{actions}</>,OptionsSelect,useSingleFlightSubmit:()=>({pending:false,onSubmit(){}}),useFormFocus:()=>({formRef:null,onInvalid(){}})}, {get:(target,key)=>key in target?target[key as keyof typeof target]:Fallback});
 require.cache[uiPath]={id:uiPath,filename:uiPath,loaded:true,exports} as NodeModule;
 let attribute:string|null='dark';const element={getAttribute:()=>attribute,setAttribute:(_name:string,value:string)=>{attribute=value;},removeAttribute:()=>{attribute=null;},dataset:new Proxy({}, {set:(_target,_key,value)=>{attribute=String(value);return true;}})};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{documentElement:element}});
 try{const {Catalog}=require('../app/biblioteca-ui/catalog') as typeof import('../app/biblioteca-ui/catalog');for(const previous of ['dark',null]){attribute=previous;let renderer!:ReturnType<typeof create>;act(()=>{renderer=create(<Catalog/>);});const theme=renderer.root.findAllByType(OptionsSelect).find(node=>node.props.label==='Tema del catálogo')!;act(()=>theme.props.onChange('contrast'));assert.equal(attribute,'contrast');act(()=>renderer.unmount());assert.equal(attribute,previous);}}
 finally{if(oldUi)require.cache[uiPath]=oldUi;else delete require.cache[uiPath];if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');}
});
