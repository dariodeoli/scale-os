import {renderedText} from './helpers/rendered-text';
import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
let insideDialog=true,closes=0,registeredPending=false,registeredDirty=false;
function FormActionsStub({children}:{children:React.ReactNode}){return <div>{children}</div>;}
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{
 FormActions:FormActionsStub,
 useDialogClose:()=>insideDialog?()=>{closes++;}:undefined,
 useDialogPending:(pending:boolean,dirty?:boolean)=>{registeredPending=pending;registeredDirty=Boolean(dirty);},
}} as NodeModule;
const {Button}=require('../app/ui/button');
const {SaveActions}=require('../app/save-actions') as typeof import('../app/save-actions');

test('legacy form actions register pending, guard cancellation, preserve submit and remain inline-safe',async()=>{
 let renderer:ReactTestRenderer;
 const primary=(disabled=false)=><button type="submit" form="legacy-form" className="primary" disabled={disabled}>Guardar original</button>;
 await act(async()=>{renderer=create(<SaveActions pending={false}>{primary(true)}</SaveActions>);});
 const cancel=()=>renderer!.root.findAllByType('button').find(button=>renderedText(button)==='Cancelar')!;
 assert.equal(registeredPending,false);
 assert.equal(cancel().props.type,'button');assert.equal(cancel().props.disabled,false);
 const submit=renderer!.root.findAllByType('button').find(button=>button.props.type==='submit')!;
 assert.equal(submit.props.disabled,true,'an unmet form prerequisite must remain disabled');
 assert.equal(submit.props.form,'legacy-form','explicit native form association is retained');
 assert(React.Children.toArray(renderer!.root.findByType(FormActionsStub).props.children).every(child=>React.isValidElement(child)&&(child.type==='button'||child.type===Button)),'FormActions receives direct native/canonical buttons, without a fragment or DOM container hiding them');
 await act(async()=>cancel().props.onClick());assert.equal(closes,1);
 await act(async()=>renderer!.update(<SaveActions pending>{primary(true)}</SaveActions>));
 assert.equal(registeredPending,true);assert.equal(cancel().props.disabled,true);
 await act(async()=>cancel().props.onClick());assert.equal(closes,1,'even direct invocation cannot cancel this pending form');
 await act(async()=>renderer!.update(<SaveActions pending={false}>{primary()}</SaveActions>));
 assert.equal(registeredPending,false);assert.equal(closes,1,'settling a save must not implicitly close a detail drawer');
 await act(async()=>cancel().props.onClick());assert.equal(closes,2);
 await act(async()=>renderer!.update(<SaveActions pending={false} cancelLabel="Volver">{primary()}</SaveActions>));
 assert.equal(renderedText(renderer!.root.findAllByType('button')[0]),'Volver');
 await act(async()=>renderer!.update(<SaveActions pending cancelLabel={false}>{primary(true)}</SaveActions>));
 assert.equal(registeredPending,true,'hiding Cancel must not suppress pending registration');
 assert.equal(renderer!.root.findAllByType('button').length,1);
 await act(async()=>renderer!.update(<SaveActions pending={false} dirty>{primary()}</SaveActions>));
 assert.equal(registeredDirty,true,'un formulario con cambios avisa al diálogo antes de descartarlos');
 await act(async()=>renderer!.update(<SaveActions pending dirty>{primary(true)}</SaveActions>));
 assert.equal(registeredDirty,false,'mientras guarda no cuenta como cambio pendiente');
 insideDialog=false;
 await act(async()=>renderer!.update(<SaveActions pending={false}>{primary()}</SaveActions>));
 assert.equal(renderer!.root.findAllByType('button').length,1,'no cancel action without a Dialog context');
 assert.equal(renderer!.root.findByType('button').props.children,'Guardar original');
 await act(async()=>renderer!.unmount());
});

test('los formularios del shell y el presupuesto avisan cambios sin guardar',()=>{
 const forms=readFileSync(new URL('../app/workspace-forms.tsx',import.meta.url),'utf8');
 assert.equal((forms.match(/<SaveActions pending=\{submission\.pending\} dirty=\{form\.formState\.isDirty\}>/g)||[]).length,5);
 assert.match(readFileSync(new URL('../app/quote-composer.tsx',import.meta.url),'utf8'),/<SaveActions pending=\{submission\.pendiente\} dirty=\{form\.formState\.isDirty\}>/);
});

test('all five legacy workspace form footers register their own submitting state',()=>{
 const source=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8')+readFileSync(new URL('../app/workspace-forms.tsx',import.meta.url),'utf8');
 const file=ts.createSourceFile('scale-workspace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=['ProjectForm','OrderForm','AccountForm','InvoiceForm','PaymentForm'];
 for(const name of names){
  const form=file.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  assert(form,`${name} must remain present`);
  const footers:ts.JsxOpeningElement[]=[];
  const visit=(node:ts.Node)=>{
   if(ts.isJsxOpeningElement(node)&&node.tagName.getText(file)==='SaveActions')footers.push(node);
   ts.forEachChild(node,visit);
  };
  visit(form);
  assert.equal(footers.length,1,`${name} must have one registered footer`);
  const pending=footers[0].attributes.properties.find((node):node is ts.JsxAttribute=>ts.isJsxAttribute(node)&&node.name.getText(file)==='pending');
  assert(pending?.initializer&&ts.isJsxExpression(pending.initializer));
  assert.equal(pending.initializer.expression?.getText(file),'submission.pending');
  const locks:ts.CallExpression[]=[];
  const inspect=(node:ts.Node)=>{
   if(ts.isCallExpression(node)&&node.expression.getText(file)==='useSingleFlightSubmit')locks.push(node);
   ts.forEachChild(node,inspect);
  };
  inspect(form);assert.equal(locks.length,1,`${name} has one single-flight lock`);
  let handlesSubmit=false;
  const inspectLocked=(node:ts.Node)=>{
   if(ts.isCallExpression(node)&&node.expression.getText(file)==='form.handleSubmit'&&node.arguments[0]?.getText(file)==='submit'){
    handlesSubmit=node===locks[0].arguments[0]||(ts.isCallExpression(node.parent)&&node.parent.expression===node);
   }
   ts.forEachChild(node,inspectLocked);
  };
  assert(locks[0].arguments[0]);inspectLocked(locks[0].arguments[0]);
  assert(handlesSubmit,'async RHF validation must execute inside the single-flight callback');
  assert(form.getText(file).includes('onSubmit={submission.onSubmit}'),'native submission uses the same lock as the footer');
 }
 assert.equal((source.match(/<SaveActions\b/g)||[]).length,5);
 assert(!source.includes('<FormActions>'),'no unregistered legacy footer remains');
});
