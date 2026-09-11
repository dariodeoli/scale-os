import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
let insideDialog=true,closes=0,registeredPending=false;
function FormActionsStub({children}:{children:React.ReactNode}){return <div>{children}</div>;}
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{
 FormActions:FormActionsStub,
 useDialogClose:()=>insideDialog?()=>{closes++;}:undefined,
 useDialogPending:(pending:boolean)=>{registeredPending=pending;},
}} as NodeModule;
const {SaveActions}=require('../app/save-actions') as typeof import('../app/save-actions');

test('legacy form actions register pending, guard cancellation, preserve submit and remain inline-safe',async()=>{
 let renderer:ReactTestRenderer;
 const primary=(disabled=false)=><button type="submit" form="legacy-form" className="primary" disabled={disabled}>Guardar original</button>;
 await act(async()=>{renderer=create(<SaveActions pending={false}>{primary(true)}</SaveActions>);});
 const cancel=()=>renderer!.root.findAllByType('button').find(button=>button.props.children==='Cancelar')!;
 assert.equal(registeredPending,false);
 assert.equal(cancel().props.type,'button');assert.equal(cancel().props.disabled,false);
 const submit=renderer!.root.findAllByType('button').find(button=>button.props.type==='submit')!;
 assert.equal(submit.props.disabled,true,'an unmet form prerequisite must remain disabled');
 assert.equal(submit.props.form,'legacy-form','explicit native form association is retained');
 assert(React.Children.toArray(renderer!.root.findByType(FormActionsStub).props.children).every(child=>React.isValidElement(child)&&child.type==='button'),'FormActions receives direct buttons, without a fragment or container hiding them');
 await act(async()=>cancel().props.onClick());assert.equal(closes,1);
 await act(async()=>renderer!.update(<SaveActions pending>{primary(true)}</SaveActions>));
 assert.equal(registeredPending,true);assert.equal(cancel().props.disabled,true);
 await act(async()=>cancel().props.onClick());assert.equal(closes,1,'even direct invocation cannot cancel this pending form');
 await act(async()=>renderer!.update(<SaveActions pending={false}>{primary()}</SaveActions>));
 assert.equal(registeredPending,false);assert.equal(closes,1,'settling a save must not implicitly close a detail drawer');
 await act(async()=>cancel().props.onClick());assert.equal(closes,2);
 await act(async()=>renderer!.update(<SaveActions pending={false} cancelLabel="Volver">{primary()}</SaveActions>));
 assert.equal(renderer!.root.findAllByType('button')[0].props.children,'Volver');
 await act(async()=>renderer!.update(<SaveActions pending cancelLabel={false}>{primary(true)}</SaveActions>));
 assert.equal(registeredPending,true,'hiding Cancel must not suppress pending registration');
 assert.equal(renderer!.root.findAllByType('button').length,1);
 insideDialog=false;
 await act(async()=>renderer!.update(<SaveActions pending={false}>{primary()}</SaveActions>));
 assert.equal(renderer!.root.findAllByType('button').length,1,'no cancel action without a Dialog context');
 assert.equal(renderer!.root.findByType('button').props.children,'Guardar original');
 await act(async()=>renderer!.unmount());
});

test('all eight legacy workspace form footers register their own submitting state',()=>{
 const source=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 const file=ts.createSourceFile('scale-workspace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=['ClientForm','ProjectForm','OrderForm','BudgetForm','AccountForm','InvoiceForm','PaymentForm','TransferForm'];
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
  assert(form.getText(file).includes('useSingleFlightSubmit(form.handleSubmit(submit))'),'lock starts before async validation');
  assert(form.getText(file).includes('onSubmit={submission.onSubmit}'),'native submission uses the same lock as the footer');
 }
 assert.equal((source.match(/<SaveActions\b/g)||[]).length,8);
 assert(!source.includes('<FormActions>'),'no unregistered legacy footer remains');
});
