import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {flattenErrorPaths,FormValidationErrors} from '../app/ui/form-focus';
Object.assign(globalThis,{React});
test('nested RHF arrays retain exact paths and ignore cyclic input refs',()=>{
 const ref:Record<string,unknown>={};ref.parent=ref;
 const errors={items:[{description:{type:'required',message:'Descripción requerida',ref}},,{unitPrice:{type:'server',message:'Precio rechazado'}}],sections:[{body:{type:'maxLength',message:'Texto demasiado largo'}}],title:{type:'min',message:'Título requerido'}};
 assert.deepEqual(flattenErrorPaths(errors),['items.0.description','items.2.unitPrice','sections.0.body','title']);
 const html=renderToStaticMarkup(<FormValidationErrors errors={errors}/>);
 assert.match(html,/Descripción requerida/);assert.match(html,/Precio rechazado/);assert.match(html,/Texto demasiado largo/);
 assert.equal((html.match(/<li /g)||[]).length,4);
});
test('top-level errors and empty containers remain compatible',()=>{
 const shared={message:'Error compartido'};assert.deepEqual(flattenErrorPaths({first:shared,second:shared}),['first','second']);
 assert.deepEqual(flattenErrorPaths({name:{message:'Nombre requerido'},empty:{},none:undefined}),['name']);
 assert.equal(renderToStaticMarkup(<FormValidationErrors errors={{}}/>),'');
});
