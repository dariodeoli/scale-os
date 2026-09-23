import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=(file)=>readFileSync(new URL(`../app/${file}`,import.meta.url),'utf8').replace(/@media\s*\(max-width[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g,'');
function rule(text,selector){
 const pattern=selector.split(' ').map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*');
 const re=new RegExp(pattern+'\\s*\\{([^}]*)\\}','g');
 let match,last=null;
 while((match=re.exec(text)))last=match[1];
 return last||'';
}
// Última regla del selector que declara la propiedad pedida: una regla posterior
// que sólo repite el padding (p. ej. el ajuste de escritorio de la fila) no debe
// invalidar la comparación de gap-x/padding entre encabezado y fila.
function ruleDeclaring(text,selector,property){
 const pattern=selector.split(' ').map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*');
 const re=new RegExp(pattern+'\\s*\\{([^}]*)\\}','g');
 const declares=new RegExp(`(?:^|[;{])\\s*${property}\\s*:`);
 let match,last=null;
 while((match=re.exec(text)))if(declares.test(match[1]))last=match[1];
 return last||'';
}
function tracks(value){
 const declaration=value.match(/--[a-z-]+-cols:([^;}]+)/);
 if(!declaration)return [];
 return declaration[1].trim().split(/\s+/);
}
function xGap(gap){
 const values=gap.match(/gap:([^;}]+)/);
 if(!values)return null;
 const parts=values[1].trim().split(/\s+/);
 return parts.length>1?parts[1]:parts[0];
}
function xPadding(padding){
 const values=padding.match(/padding:([^;}]+)/);
 if(!values)return null;
 const parts=values[1].trim().split(/\s+/);
 return parts.length>=2?parts[1]:parts[0];
}

const lists=[
 {name:'equipo',vars:'operations.css',source:'operations.css',head:'.person-hub-head-row',row:'.person-hub-card.is-list',decl:'.ops-grid-list'},
];
// Inventario y reservas se rediseñaron con Tailwind + owncoding-ui (campaña #41,
// spec #44): su plantilla ya no vive en una hoja CSS. El contrato v2 de esas
// listas se verifica en `tests/ops-v2-contract.test.ts` (una sola plantilla por
// lista, compartida entre encabezado y filas, sin truncar datos).
// Clientes (issue #43) siguió el mismo camino: la fila finita es ListGrid/ListRow
// con plantilla Tailwind y el contrato lo cubre `tests/ux-consistency.test.ts`.

for(const list of lists){
 const file=css(list.source);
 const declaration=rule(file,list.decl);
 const head=rule(file,list.head);
 const row=rule(file,list.row);
 test(`${list.name}: encabezado y filas comparten la plantilla`,()=>{
  assert.match(declaration,/--[a-z-]+-cols:/,`${list.name} declara su plantilla`);
  assert.match(head,/grid-template-columns:var\(--[a-z-]+-cols\)/,`${list.name}: el encabezado usa la variable compartida`);
  const rowPattern=list.row.split(' ').map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*');
  assert.match(file,new RegExp(rowPattern+'\\{[^}]*grid-template-columns:var\\(--[a-z-]+-cols\\)'),`${list.name}: la fila usa la variable compartida`);
 });
 test(`${list.name}: columnas de ancho fijo (nada de auto por tarjeta)`,()=>{
  const columns=tracks(declaration);
  assert.ok(columns.length>=4,`${list.name}: la plantilla tiene columnas`);
  for(const column of columns){
   assert.notEqual(column,'auto',`${list.name}: una columna auto se dimensiona por tarjeta y desalinea`);
   assert.doesNotMatch(column,/minmax\([^)]*,auto\)$/,`${list.name}: minmax con máximo auto se dimensiona por tarjeta`);
  }
 });
 test(`${list.name}: mismo gap-x y padding lateral en encabezado y fila`,()=>{
  assert.equal(xGap(ruleDeclaring(file,list.head,'gap')),xGap(ruleDeclaring(file,list.row,'gap')),`${list.name}: gap-x del encabezado y de la fila`);
  assert.equal(xPadding(ruleDeclaring(file,list.head,'padding')),xPadding(ruleDeclaring(file,list.row,'padding')),`${list.name}: padding lateral del encabezado y de la fila`);
 });
 test(`${list.name}: la última columna (acciones) alinea a la derecha en el encabezado`,()=>{
  const headPattern=list.head.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(file,new RegExp(headPattern+' span:last-child\\{justify-self:end\\}'),`${list.name}: el encabezado de acciones cierra a la derecha como la fila`);
 });
}

const cells={
 equipo:{file:'operations.css',selectors:['.person-hub-facts','.person-hub-state','.person-hub-chips','.person-hub-actions','.team-access']},
};
for(const [name,{file,selectors}] of Object.entries(cells)){
 test(`${name}: ninguna celda no-identidad se fuerza a la columna 1`,()=>{
  const desktop=css(file);
  for(const selector of selectors){
   const pattern=new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{[^}]*grid-column:1(?![/\\d])');
   assert.doesNotMatch(desktop,pattern,`${selector} no puede quedar en la columna de identidad`);
  }
 });
}
