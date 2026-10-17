import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {EmailField} from '../app/email-field';
import {PhoneField} from '../app/phone-field';
import {PasswordField} from '../app/password-field';
import {EMAIL_MAX_LENGTH,PHONE_COUNTRIES,emailValid,phoneNational,phoneParts,phoneValid,phoneValue} from '../app/field-rules';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const apiCodes=['+595','+598','+54','+55','+56','+57','+51','+52','+591','+1','+34','+351'];
assert.deepEqual(PHONE_COUNTRIES.map(c=>c.code).sort(),apiCodes.sort());
for(const code of apiCodes){
 const digits=code==='+595'?'981123456':'123456789';
 assert.deepEqual(phoneParts(`${code} ${digits}`),{countryCode:code,phone:digits});
 assert(phoneValid(`${code} ${digits}`));
 assert.equal(phoneValue(code,digits),`${code} ${digits}`);
}
assert.equal(phoneNational('12345678901234567890'),'12345678901234567890','invalid pasted numbers are never silently truncated');
assert.equal(phoneValid('+595 9811234560000'),false);
assert.equal(phoneValid('+598 1234567890123'),false);
assert.equal(phoneValid('+49 123456789'),false);
assert.equal(phoneValue('', '+49 123456789'),'+49 123456789');
assert.equal(emailValid(`${'a'.repeat(242)}@example.com`),true);
assert.equal(emailValid(`${'a'.repeat(243)}@example.com`),false);
assert.equal(EMAIL_MAX_LENGTH,254);

async function main(){
 let r:ReactTestRenderer;const changes:string[]=[];
 await act(async()=>{r=create(<><EmailField value="ana@g" onChange={v=>changes.push(v)}/><EmailField value="bea@g" onChange={v=>changes.push(v)}/></>);});
 const emails=r!.root.findAllByType('input');
 assert.notEqual(emails[0].props.id,emails[1].props.id);
 for(const input of emails){assert(input.props.id);assert.equal(input.props.maxLength,254);assert.equal(input.props.list,`${input.props.id}-domains`);}
 const stableId=emails[0].props.id;
 await act(async()=>r!.update(<><EmailField value="ana@hotmail.com" onChange={v=>changes.push(v)}/><EmailField value="bea@g" onChange={v=>changes.push(v)}/></>));
 assert.equal(r!.root.findAllByType('input')[0].props.id,stableId);
 assert.deepEqual(changes,[],'mount and rerender never overwrite saved values');
 await act(async()=>r!.root.findAllByType('input')[0].props.onChange({target:{value:'Ana@Example.com'}}));
 assert.deepEqual(changes,['Ana@Example.com'],'typing preserves text; API normalizes email on save');
 await act(async()=>r!.unmount());

 for(const value of ['+598 123456789','+49 123456789','+595 12345678901234567890']){
  const updates:string[]=[];
  await act(async()=>{r=create(<PhoneField value={value} onChange={v=>updates.push(v)} invalid={true} describedBy="phone-error"/>);});
  assert.deepEqual(updates,[]);
  const input=r!.root.findByType('input'),select=r!.root.findByType('select');
  assert.equal(input.props['aria-invalid'],true);assert.equal(input.props['aria-describedby'],'phone-error');
  assert.equal(input.props.maxLength,undefined);
  assert.equal(input.props.value,value.startsWith('+49')?value:phoneParts(value).phone);
  assert.equal(select.props.value,value.startsWith('+49')?'':phoneParts(value).countryCode);
  await act(async()=>r!.unmount());
 }
 const updates:string[]=[];
 await act(async()=>{r=create(<PhoneField value="+598 123456789" onChange={v=>updates.push(v)}/>);});
 await act(async()=>r!.root.findByType('input').props.onChange({target:{value:'012345678901234'}}));
 assert.equal(updates[0],'+598 12345678901234','too-long entry reaches validation intact');
 await act(async()=>r!.root.findByType('select').props.onChange({target:{value:'+351'}}));
 assert.equal(updates[1],'+351 123456789','country change only after explicit selection');
 await act(async()=>r!.unmount());

 await act(async()=>{r=create(<PasswordField disabled label="Clave" name="password" value="secreto" onChange={()=>assert.fail('not called')} autoComplete="new-password"/>);});
 assert.equal(r!.root.findByType('input').props.disabled,true);
 assert.equal(r!.root.findByType('button').props.disabled,true);
 await act(async()=>r!.unmount());

 // Verify actual Editor adapters while isolating layout/browser-only collaborators.
 function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
 const Amount=(props:Record<string,unknown>)=><input data-amount="true" {...props}/>;
 const Container=({children}:{children:React.ReactNode})=><div>{children}</div>;
 mock('../app/profile-controls',{AmountInput:Amount,SelectCustom:Container});
 mock('../app/dialog',{Dialog:Container,FormActions:Container,useDialogClose:()=>undefined,useDialogPending:()=>{}});
 const {Editor}=require('../app/operations') as typeof import('../app/operations');
 const invalidWrites:Record<string,string>[]=[];
 await act(async()=>{r=create(<Editor fields={[{key:'phone',label:'Teléfono',type:'phone'}]} defaults={{phone:'+595 123456789012345'}} save={async v=>{invalidWrites.push(v);}}/>);});
 await act(async()=>{await r!.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});
 assert.equal(invalidWrites.length,0,'invalid loaded values cannot be written silently');
 assert.equal(r!.root.findByType(PhoneField).props.value,'+595 123456789012345');
 assert(r!.root.findAllByProps({role:'alert'}).length>0,'invalid phone produces linked inline error');
 await act(async()=>{r!.root.findByType(PhoneField).props.onChange('+598 123456789');});
 await act(async()=>{await r!.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});
 assert.equal(invalidWrites[0].phone,'+598 123456789');
 await act(async()=>r!.unmount());
 const writes:Record<string,string>[]=[];
 let release:()=>void=()=>{};
 const blocked=new Promise<void>(resolve=>{release=resolve;});
 await act(async()=>{r=create(<Editor fields={[{key:'amount',label:'Monto',type:'money',integer:true,currency:'USD'},{key:'password',label:'Clave',type:'password'},{key:'phone',label:'Teléfono',type:'phone'}]} defaults={{amount:'12',password:'password123',phone:'+598 123456789'}} save={async v=>{writes.push(v);await blocked;throw new Error('Sin conexión');}}/>);});
 assert.equal(r!.root.findByType(Amount).props.integerOnly,true);
 let submission:Promise<unknown>;
 await act(async()=>{submission=r!.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});await new Promise(resolve=>setImmediate(resolve));});
 assert.equal(writes.length,1);assert.equal(writes[0].phone,'+598 123456789');
 const password=r!.root.findByType(PasswordField);
 assert.equal(password.props.disabled,true);
 await act(async()=>{release();await submission!;});
 assert.equal(r!.root.findByType(PasswordField).props.disabled,false);
 assert.equal(r!.root.findByType(PasswordField).props.value,'password123','failed save preserves draft');
 assert.equal(r!.root.findByType(PhoneField).props.value,'+598 123456789');
 assert(r!.root.findAllByProps({role:'alert'}).some(node=>JSON.stringify(node.children).includes('Sin conexión')));
 await act(async()=>r!.unmount());
 console.log('PASS: field contracts #241 — API countries, preserved legacy/length, email IDs/limits, integer amount and password pending/error');
}
void main();
