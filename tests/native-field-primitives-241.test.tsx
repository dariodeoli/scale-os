import React,{createRef} from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {Input,Textarea} from '../app/ui/input';
import {TextField} from '../app/text-field';
import {EmailField} from '../app/email-field';
import {PhoneField} from '../app/phone-field';
import {PasswordField} from '../app/password-field';
Object.assign(globalThis,{React});

async function main(){
 let r:ReactTestRenderer;
 const inputRef=createRef<HTMLInputElement>(),textareaRef=createRef<HTMLTextAreaElement>();
 const inputNode={focus(){},kind:'input'},textareaNode={focus(){},kind:'textarea'};
 const value='  Legacy +595 0981 <raw>  ';
 const events:unknown[]=[];
 const event={target:{value:' Pasted \n unchanged '}};
 await act(async()=>{r=create(<><Input ref={inputRef} value={value} className="local-class" type="email" name="email" form="profile" disabled required aria-invalid="true" aria-describedby="error" data-contract="input" onChange={e=>events.push(e)}/><Textarea ref={textareaRef} value={value} className="notes" name="notes" rows={4} maxLength={2000} readOnly aria-label="Notas" onChange={e=>events.push(e)}/></>,{createNodeMock:element=>element.type==='input'?inputNode:element.type==='textarea'?textareaNode:null});});
 assert.equal(inputRef.current,inputNode);assert.equal(textareaRef.current,textareaNode);
 const input=r!.root.findByType('input'),textarea=r!.root.findByType('textarea');
 assert.equal(input.props.className,'ui-input local-class');assert.equal(textarea.props.className,'ui-textarea notes');
 assert.equal(input.props.value,value);assert.equal(textarea.props.value,value);
 assert.equal(input.props.name,'email');assert.equal(input.props.form,'profile');assert.equal(input.props.type,'email');
 assert.equal(input.props.disabled,true);assert.equal(input.props.required,true);assert.equal(input.props['aria-invalid'],'true');assert.equal(input.props['aria-describedby'],'error');
 assert.equal(textarea.props.rows,4);assert.equal(textarea.props.maxLength,2000);assert.equal(textarea.props.readOnly,true);
 assert.deepEqual(events,[],'mount never emits a normalization/write');
 await act(async()=>{input.props.onChange(event);textarea.props.onChange(event);});
 assert.deepEqual(events,[event,event],'callbacks receive exact original event');
 const inputInstance=r!.root.findByType('input');
 await act(async()=>r!.update(<><Input ref={inputRef} value="next"/><Textarea ref={textareaRef} value="other"/></>));
 assert.equal(r!.root.findByType('input'),inputInstance,'stable primitive retains native element identity');
 assert.equal(r!.root.findByType('input').props.className,'ui-input');
 assert.equal(r!.root.findByType('textarea').props.className,'ui-textarea');
 await act(async()=>r!.unmount());
 assert.equal(inputRef.current,null);assert.equal(textareaRef.current,null);

 const writes:string[]=[];
 await act(async()=>{r=create(<><TextField value="  Nombre " onChange={v=>writes.push(v)}/><EmailField value="Ana@Example.com" onChange={v=>writes.push(v)}/><PhoneField value="+598 123456789" onChange={v=>writes.push(v)}/><PasswordField label="Clave" name="password" autoComplete="new-password" value=" Not trim " onChange={v=>writes.push(v)}/></>);});
 assert.equal(r!.root.findAllByType(Input).length,4,'all semantic wrappers compose native canonical Input');
 assert(r!.root.findAllByType('input').every(node=>String(node.props.className).includes('ui-input')));
 assert.deepEqual(writes,[]);
 assert.deepEqual(r!.root.findAllByType('input').map(node=>node.props.value),['  Nombre ','Ana@Example.com','123456789',' Not trim ']);
 await act(async()=>r!.unmount());
 console.log('PASS: native primitives #241 — forwarded refs/props/events, stable inputs, values preserved and four semantic adopters');
}
void main();
