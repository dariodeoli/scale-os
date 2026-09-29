import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EMPTY_WINDOW, LIST_WINDOW, appendPage, readPage, windowLabel, windowSlice, windowStateOf} from '../app/list-window';

// #105: ventanas de lista. El contrato es aditivo: sin `page` del API la
// pantalla se comporta como antes (lista completa, sin promesa de más).

test('la página del API se lee solo con la forma canónica',()=>{
 assert.deepEqual(readPage({limit:60,offset:0,hasMore:true,total:320}),{limit:60,offset:0,hasMore:true,total:320});
 assert.deepEqual(readPage({limit:60,offset:120,hasMore:false,total:180}),{limit:60,offset:120,hasMore:false,total:180});
 for(const invalido of [null,undefined,'page',{}, {limit:'60',offset:0,hasMore:true,total:1}, {limit:60,offset:0,hasMore:'si',total:1}, {limit:60,offset:0,hasMore:true}, {limit:60,offset:0,hasMore:true,total:1.5}])
  assert.equal(readPage(invalido),null,`sin forma de page: ${JSON.stringify(invalido)}`);
});

test('el estado de la ventana no inventa un total cuando el API no lo manda',()=>{
 assert.deepEqual(windowStateOf(readPage({limit:60,offset:0,hasMore:true,total:320}),60),{loaded:60,hasMore:true,total:320});
 assert.deepEqual(windowStateOf(null,20),{loaded:20,hasMore:false,total:null},'sin page la lista se considera completa');
 assert.deepEqual(EMPTY_WINDOW,{loaded:0,hasMore:false,total:null});
});

test('la etiqueta es honesta con y sin total',()=>{
 assert.equal(windowLabel(60,320,'presupuesto','presupuestos'),'Mostrando 60 de 320 presupuestos');
 assert.equal(windowLabel(1,320,'presupuesto','presupuestos'),'Mostrando 1 de 320 presupuestos');
 assert.equal(windowLabel(20,20,'plan','planes'),'Mostrando 20 planes','sin faltantes no dice «de»');
 assert.equal(windowLabel(60,null,'cliente','clientes'),'Mostrando 60 clientes','sin total no inventa el faltante');
 assert.equal(windowLabel(1,null,'cliente','clientes'),'Mostrando 1 cliente');
});

test('sumar una página no duplica filas y el corte respeta el tamaño',()=>{
 const current=[{id:1},{id:2}];
 assert.deepEqual(appendPage(current,[{id:2},{id:3}]),[{id:1},{id:2},{id:3}]);
 assert.equal(appendPage(current,[]),current,'sin filas nuevas se conserva la referencia');
 assert.deepEqual(windowSlice([1,2,3],2),[1,2]);
 assert.deepEqual(windowSlice([1,2],5),[1,2]);
 assert.deepEqual(windowSlice([],5),[]);
});

test('las ventanas por lista quedan acotadas y explícitas',()=>{
 assert.deepEqual(LIST_WINDOW,{clients:120,budgets:60,plans:60,leads:300,leadsColumns:40});
 for(const value of Object.values(LIST_WINDOW))assert(value>0&&value<=500,'dentro del máximo del API (500)');
});
