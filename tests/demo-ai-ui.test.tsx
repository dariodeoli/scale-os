import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const mock=(name:string,exports:unknown)=>{const id=require.resolve(name);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;};
const passthrough=({children}:{children:React.ReactNode})=><div>{children}</div>;
mock('../app/dialog',{Dialog:passthrough,FormActions:passthrough,useDialogClose:()=>undefined,useDialogPending:()=>{}});
mock('../app/operations',{api:async()=>({categories:[]})});
const data=require('../app/ia-carga-data') as typeof import('../app/ia-carga-data');
let config:import('../app/ia-carga-data').IaConfig={configurada:false,modelo:null,tipos:['clientes'],demoRestricted:true};
mock('../app/ia-carga-data',{...data,cargarConfigIa:async()=>config});
const {IaCargaDialog}=require('../app/ia-carga') as typeof import('../app/ia-carga');
async function main(){
let renderer!:ReactTestRenderer,closed=0;
await act(async()=>{renderer=create(<IaCargaDialog role="owner" close={()=>{closed++;}} onCreated={()=>{}}/>);});
let text=JSON.stringify(renderer.toJSON());
assert.match(text,/no está disponible en la demostración/);
assert.match(text,/manualmente desde cada módulo/);
assert.doesNotMatch(text,/clave del proveedor|IA no está configurada|motor de IA todavía no/);
assert.equal(renderer.root.findAllByType('textarea').length,0,'demo never presents a paid analysis form');
await act(async()=>{renderer.root.findAllByType('button').find(node=>node.children.includes('Entendido'))!.props.onClick();});
assert.equal(closed,1);
await act(async()=>renderer.unmount());
config={configurada:true,modelo:'normal-provider',tipos:['clientes']};
await act(async()=>{renderer=create(<IaCargaDialog role="owner" close={()=>{}} onCreated={()=>{}}/>);});
text=JSON.stringify(renderer.toJSON());
assert.doesNotMatch(text,/no está disponible en la demostración/);
assert(renderer.root.findAllByType('textarea').length>0,'normal callers retain the analysis form');
await act(async()=>renderer.unmount());
console.log('PASS demo IA UI: clear manual-entry message, no paid form or technical configuration prompts; normal IA form preserved.');

}
void main();
