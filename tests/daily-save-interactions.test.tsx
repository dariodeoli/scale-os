import React from 'react';
import assert from 'node:assert/strict';
import {test,after,afterEach} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

// Real financial components, Editor/RHF validation, Dialog hooks, SaveActions and
// completeSave. Only transport, visual controls and portal/DOM hosts are doubled.
// No browser, HTTP, bank operation, real identity or production data is involved.
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw Error('Network forbidden in isolated financial form tests');};
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
type Notice={tone:string;message:string};
const notices:Notice[]=[];
mock('../app/feedback',{notify:(notice:Notice)=>notices.push(notice),notifyMutation:()=>{}});
type ResponseDouble={ok:boolean;json:()=>Promise<unknown>};
type Write={path:string;body:Record<string,unknown>;resolve:(response:ResponseDouble)=>void};
const writes:Write[]=[];
mock('../app/data-cache',{dataFetch:(path:string,options:{method:string;body:string})=>{
 assert.equal(options.method,'POST');
 assert(['/core-api/api/agency/transfers','/core-api/api/agency/payments/fixture-payment/reverse'].includes(path),'unexpected request path');
 return new Promise<ResponseDouble>(resolve=>writes.push({path,body:JSON.parse(options.body),resolve}));
}});
function SelectDouble({label,value,onChange,disabled}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean}){
 return <select aria-label={label} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}/>;
}
function AmountDouble({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 return <input data-amount value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}/>;
}
mock('../app/profile-controls',{SelectCustom:SelectDouble,AmountInput:AmountDouble});
const dom=require('react-dom'),originalPortal=dom.createPortal;
dom.createPortal=(children:React.ReactNode)=>children;
type KeyEvent={key:string;target:{tagName:string};defaultPrevented:boolean;preventDefault:()=>void;stopImmediatePropagation:()=>void};
const listeners=new Map<string,Set<(event:KeyEvent)=>void>>();
const previous={isConnected:true,focus(){}};
const doc={body:{style:{overflow:'auto'}},activeElement:previous,
 addEventListener(name:string,fn:(event:KeyEvent)=>void){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(fn);},
 removeEventListener(name:string,fn:(event:KeyEvent)=>void){listeners.get(name)?.delete(fn);},
};
const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
const {Dialog}=require('../app/dialog') as typeof import('../app/dialog');
const {FXTransferForm,ReceiptReversal}=require('../app/daily-controls') as typeof import('../app/daily-controls');
let renderer:ReactTestRenderer|undefined;
const root=()=>renderer!.root;
async function mount(tree:React.ReactElement){await act(async()=>{renderer=create(tree,{createNodeMock:element=>
 element.type==='section'?{querySelector:()=>({focus(){}})}:element.type==='span'?{closest:()=>null}:element.props.className==='dialog-footer'?{}:null,
});});}
const event=()=>({preventDefault(){},persist(){}});
const submit=()=>root().findByType('form').props.onSubmit(event()) as Promise<void>;
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
function escape(){const e:KeyEvent={key:'Escape',target:{tagName:'BUTTON'},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){}};listeners.get('keydown')?.forEach(fn=>fn(e));}
function tryDismiss(){act(()=>{
 escape();root().findByProps({'aria-label':'Cerrar'}).props.onClick();
 const target={};root().findByProps({className:'ops-overlay'}).props.onMouseDown({target,currentTarget:target,button:0});
 root().findAllByType('button').find(button=>button.props.children==='Cancelar')!.props.onClick();
});}
function settle(write:Write,ok:boolean){write.resolve({ok,json:async()=>ok?{ok:true}:{error:'Persistencia rechazada de prueba'}});}
async function fillTransfer(){await act(async()=>{
 root().findByProps({'aria-label':'Cuenta de origen'}).props.onChange({target:{value:'fixture-a'}});
 root().findByProps({'aria-label':'Cuenta de destino'}).props.onChange({target:{value:'fixture-b'}});
 root().findAllByProps({'data-amount':true}).forEach(input=>input.props.onChange({target:{value:'10'}}));
});}
const accounts=[{id:'fixture-a',name:'Cuenta ficticia A',currency:'PYG',active:true},{id:'fixture-b',name:'Cuenta ficticia B',currency:'PYG',active:true}];
afterEach(async()=>{
 await act(async()=>renderer?.unmount());renderer=undefined;
 assert.equal(doc.body.style.overflow,'auto');assert.equal(Array.from(listeners.values()).reduce((sum,set)=>sum+set.size,0),0);
 writes.length=0;notices.length=0;
});
after(()=>{
 dom.createPortal=originalPortal;globalThis.fetch=originalFetch;
 if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');
});

test('FX transfer: single-flight through validation/persistence/completion; all dismissals locked; failed draft retries with same requestId',async()=>{
 let closed=0,completed=0,releaseDone:()=>void=()=>{};
 await mount(<Dialog title="Transferencia ficticia" close={()=>closed++}><FXTransferForm accounts={accounts} done={async()=>{completed++;await new Promise<void>(resolve=>{releaseDone=resolve;});}}/></Dialog>);
 await fillTransfer();
 let first!:Promise<void>,duplicate!:Promise<void>;
 await act(async()=>{first=submit();duplicate=submit();await duplicate;await tick();});
 assert.equal(writes.length,1,'duplicate submit must not enter the transport');
 assert.equal(root().findByType('form').props['aria-busy'],true,'duplicate cannot release pending');
 assert.equal(root().findByProps({role:'dialog'}).props['aria-busy'],true);
 assert(root().findAllByType('button').every(button=>button.props.disabled));
 assert(root().findAllByType('input').every(input=>input.props.disabled));
 assert(root().findAllByType('select').every(input=>input.props.disabled));
 tryDismiss();assert.equal(closed,0);assert.equal(completed,0);
 await act(async()=>{settle(writes[0],false);await first;});
 assert.equal(root().findByType('form').props['aria-busy'],false);assert.equal(completed,0);
 assert(JSON.stringify(renderer!.toJSON()).includes('Persistencia rechazada de prueba'));
 assert(root().findAllByProps({'data-amount':true}).every(input=>input.props.value==='10'));
 assert.equal(root().findByProps({'aria-label':'Cuenta de origen'}).props.value,'fixture-a');
 const requestId=writes[0].body.requestId;assert.equal(typeof requestId,'string');
 let retry!:Promise<void>;
 await act(async()=>{retry=submit();await tick();});assert.equal(writes.length,2);assert.equal(writes[1].body.requestId,requestId);
 assert.equal(root().findAllByProps({role:'alert'}).length,0,'old error cleared on retry');
 await act(async()=>{settle(writes[1],true);await tick();});
 assert.equal(completed,1);assert.equal(root().findByType('form').props['aria-busy'],true,'completion is awaited');
 await act(async()=>{await submit();});assert.equal(writes.length,2,'completion still owns single-flight lock');tryDismiss();assert.equal(closed,0);
 await act(async()=>{releaseDone();await retry;});assert.equal(root().findByType('form').props['aria-busy'],false);
 tryDismiss();assert.equal(closed,4,'Escape/header/backdrop/cancel are available after settling');assert.equal(notices.length,0);
});

test('FX transfer: validation and equal-currency failures unlock without writes, allowing correction',async()=>{
 let closed=0,done=0;
 await mount(<Dialog title="Validación" close={()=>closed++}><FXTransferForm accounts={accounts} done={()=>{done++;}}/></Dialog>);
 await act(async()=>{await submit();});assert.equal(writes.length,0);assert.equal(root().findByType('form').props['aria-busy'],false);
 assert(root().findAllByProps({role:'alert'}).length>0);
 await fillTransfer();await act(async()=>root().findAllByProps({'data-amount':true})[1].props.onChange({target:{value:'11'}}));
 await act(async()=>{await submit();});assert.equal(writes.length,0);assert(JSON.stringify(renderer!.toJSON()).includes('los importes deben coincidir'));
 assert.equal(root().findByType('form').props['aria-busy'],false);assert.equal(done,0);
 tryDismiss();assert.equal(closed,4);
});

test('receipt reversal: persistence failure retains draft; confirmed retry closes before failed refresh, warning without another write',async()=>{
 let refreshes=0,rejectRefresh:(error:Error)=>void=()=>{};
 await mount(<ReceiptReversal payment={{id:'fixture-payment',amount:'10',currency:'PYG'}} refresh={async()=>{refreshes++;await new Promise<void>((_resolve,reject)=>{rejectRefresh=reject;});}}/>);
 await act(async()=>root().findByType('button').props.onClick());
 await act(async()=>{
  root().findByType('textarea').props.onChange({target:{name:'reason',value:'Corrección ficticia'},type:'change'});
  root().findByType('input').props.onChange({target:{name:'confirmation',value:'NO'},type:'change'});
 });
 await act(async()=>{await submit();});assert.equal(writes.length,0);assert(JSON.stringify(renderer!.toJSON()).includes('Escribí REVERTIR para confirmar'));
 await act(async()=>root().findByType('input').props.onChange({target:{name:'confirmation',value:'REVERTIR'},type:'change'}));
 let first!:Promise<void>;
 await act(async()=>{first=submit();await tick();});assert.equal(writes.length,1);
 tryDismiss();assert.equal(root().findAllByProps({role:'dialog'}).length,1);assert.equal(refreshes,0);
 await act(async()=>{settle(writes[0],false);await first;});
 assert.equal(root().findAllByProps({role:'dialog'}).length,1);assert.equal(refreshes,0);assert.equal(notices.length,0);
 assert(JSON.stringify(renderer!.toJSON()).includes('Persistencia rechazada de prueba'));
 let retry!:Promise<void>;
 await act(async()=>{retry=submit();await tick();});assert.equal(writes.length,2);assert.deepEqual(writes[1].body,{reason:'Corrección ficticia'});
 await act(async()=>{settle(writes[1],true);await tick();});
 assert.equal(refreshes,1);assert.equal(root().findAllByProps({role:'dialog'}).length,0,'confirmed mutation closes while refresh is still pending');
 await act(async()=>{rejectRefresh(Error('Refresh unavailable'));await retry;});
 assert.equal(writes.length,2,'one failed request + explicit retry; refresh failure never retries mutation');
 assert.equal(root().findAllByProps({role:'dialog'}).length,0);assert.equal(notices.length,1);assert.equal(notices[0].tone,'warning');
 assert.match(notices[0].message,/Se guardó correctamente/);assert.match(notices[0].message,/no hace falta guardar otra vez/);
});
