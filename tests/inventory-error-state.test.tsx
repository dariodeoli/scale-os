import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

// Estado de error y reintento del inventario (orden del dueño, #44): el
// catálogo puede fallar por timeout (36 MB de payload), por red o por una
// respuesta no-JSON del proxy. Este test fija el comportamiento esperado:
// mensajes accionables con la sección que falló, reintento automático de la
// carga inicial para fallos transitorios, reintento manual y refresco que no
// borra los datos ya visibles.

// Entorno mínimo de navegador para el hook (polling, visibilidad y espera del
// reintento, que se resuelve al instante para no dormir el test).
Object.assign(globalThis,{
 React,
 window:{setInterval:()=>0,clearInterval:()=>{},setTimeout:(handler:()=>void)=>{handler();return 0;}},
 document:{visibilityState:'visible',addEventListener:()=>{},removeEventListener:()=>{}},
});
require.extensions['.css']=()=>{};

// --- Transporte mockeado por modo -------------------------------------------
type Mode='ok'|'catalog-timeout'|'network'|'categories-permission';
let mode:Mode='ok';
let catalogCalls=0,reservationCalls=0;
const apiCalls=new Map<string,number>();
const bump=(map:Map<string,number>,key:string)=>map.set(key,(map.get(key)||0)+1);
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const timeoutError=()=>Object.assign(new Error('The operation was aborted due to timeout'),{name:'TimeoutError'});
mock('../app/operations',{api:(path:string)=>{
 bump(apiCalls,path);
 if(mode==='categories-permission'&&path.endsWith('/inventory-categories'))return Promise.reject(new Error('Tu rol no permite esta operación'));
 if(mode==='network')return Promise.reject(new TypeError('fetch failed'));
 if(path.endsWith('/inventory-context'))return Promise.resolve({role:'owner',can_manage:true,can_reserve:true,members:[],projects:[]});
 if(path.endsWith('/inventory-categories'))return Promise.resolve({categories:[]});
 if(path.endsWith('/inventory-locations'))return Promise.resolve({locations:[]});
 return Promise.resolve({ok:true});
}});
mock('../app/data-cache',{dataFetch:(url:string)=>{
 if(url.includes('/inventory-reservations')){reservationCalls++;return mode==='ok'||mode==='categories-permission'?Promise.resolve(json({reservations:[]})):Promise.reject(new TypeError('fetch failed'));}
 catalogCalls++;
 if(mode==='catalog-timeout')return Promise.reject(timeoutError());
 if(mode==='network')return Promise.reject(new TypeError('fetch failed'));
 return Promise.resolve(json({records:[{id:'1',name:'Cámara 1'}]}));
}});
const {useInventoryCatalog,inventoryErrorText,isTransientInventoryError,CATALOG_TIMEOUT_MS}=require('../app/use-inventory-data') as typeof import('../app/use-inventory-data');
type InventoryCatalog=import('../app/use-inventory-data').InventoryCatalog;

let state:InventoryCatalog;
let setRefresh:(value:(current:number)=>number)=>void;
function Probe(){const [refresh,update]=React.useState(0);setRefresh=update;state=useInventoryCatalog('2026-09',refresh);return null;}
const settle=()=>act(async()=>{for(let i=0;i<6;i++)await Promise.resolve();});
const nextCycle=async()=>{await act(async()=>{setRefresh(current=>current+1);});await settle();};

async function run(){
 // 1) Fallo de permisos (no transitorio) en la primera carga: un solo intento,
 //    mensaje con la sección que falló y sin datos a medias.
 mode='categories-permission';
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<Probe/>);});
 await settle();
 assert.equal(catalogCalls,1,'un fallo no transitorio no se reintenta solo');
 assert.equal(state.error,'Las categorías de inventario: Tu rol no permite esta operación','el error nombra la sección y el mensaje del API');
 assert.equal(state.loading,false,'el estado de error no queda cargando');
 assert.equal(state.items.length,0,'sin datos no se muestran listas vacías');

 // 2) Timeout del catálogo (transitorio): reintento automático de la primera
 //    carga y mensaje con la sección y los segundos reales del timeout.
 const before=catalogCalls;
 await act(async()=>{renderer.unmount();renderer=create(<Probe/>);});
 await settle();
 assert.equal(catalogCalls-before,1,'arranca un ciclo nuevo tras remontar');
 mode='catalog-timeout';
 await nextCycle();
 assert.equal(catalogCalls-before,3,'el timeout transitorio se reintenta solo una vez (2 intentos)');
 assert.equal(state.error,'El catálogo de equipos tardó más de 45 s en responder con los datos. Reintentá; si sigue igual, avisá a soporte.','el error nombra la sección y el timeout real');
 assert.equal(state.items.length,0,'sigue sin datos visibles');

 // 3) Reintento manual desde el estado de error: ahora carga.
 mode='ok';
 const catalogBeforeRetry=catalogCalls;
 await nextCycle();
 assert.equal(catalogCalls-catalogBeforeRetry,1,'el reintento manual pide el catálogo una vez');
 assert.equal(state.error,'','el reintento exitoso limpia el estado de error');
 assert.equal(state.items.length,1,'el reintento deja los datos en pantalla');

 // 4) Refresco de fondo que falla: conserva lo visible y avisa aparte.
 mode='network';
 await nextCycle();
 assert.equal(state.items.length,1,'el fallo de un refresco no borra los datos');
 assert.match(state.refreshError,/no hay conexión con el servidor/i,'el refresco avisa sin pantalla completa');
 assert.equal(state.error,'','el error total no se dispara con datos en pantalla');

 // 5) Un error de permisos en un refresco tampoco rompe la pantalla.
 mode='categories-permission';
 await nextCycle();
 assert.equal(state.items.length,1,'los datos siguen visibles ante un error de permisos');
 assert.equal(state.refreshError,'Las categorías de inventario: Tu rol no permite esta operación','el mensaje del API viaja con la sección');

 // 6) Mapeo de mensajes (unitario) y clasificación de transitorios.
 assert.equal(inventoryErrorText(new SyntaxError('Unexpected token <'),'las reservas del mes',20000),'El servidor devolvió una respuesta inesperada al pedir las reservas del mes. Reintentá; si sigue igual, avisá a soporte.');
 assert.equal(inventoryErrorText(new Error('x'.repeat(400)),'el catálogo de equipos',CATALOG_TIMEOUT_MS),'No se pudo cargar el catálogo de equipos. Reintentá en unos segundos.','un mensaje crudo larguísimo no se muestra tal cual');
 assert.equal(inventoryErrorText(timeoutError(),'las reservas del mes',20000),'Las reservas del mes tardó más de 20 s en responder con los datos. Reintentá; si sigue igual, avisá a soporte.');
 assert.equal(isTransientInventoryError(timeoutError()),true,'el timeout es transitorio');
 assert.equal(isTransientInventoryError(new TypeError('fetch failed')),true,'la caída de red es transitoria');
 assert.equal(isTransientInventoryError(new SyntaxError('bad json')),true,'una respuesta no-JSON del proxy es transitoria');
 assert.equal(isTransientInventoryError(new Error('Tu rol no permite esta operación')),false,'un 4xx no se reintenta solo');
 assert(reservationCalls>0,'las reservas del mes se piden con su propio timeout');

 await act(async()=>{renderer.unmount();});
 console.log('PASS inventario: estado de error accionable por sección, reintento automático de la carga inicial, reintento manual, refresco que conserva datos y clasificación de fallos.');
}
void run();
