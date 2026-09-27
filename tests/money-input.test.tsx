import React from 'react';
import assert from 'node:assert/strict';
import {act,create} from 'react-test-renderer';

Object.assign(globalThis,{React});
const {AmountInput}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const changed:string[]=[];
const prefixOf=(renderer:ReturnType<typeof create>)=>JSON.stringify(renderer.toJSON());
// El campo de monto de la app es un puente sobre `MoneyInput` de owncoding-ui
// v0.39 (#75): conserva el caret, acepta pegado es-PY/en-US y mantiene la API
// local (`onChange(value:string)`, `required`, símbolos por moneda).
let renderer=create(<AmountInput value="4000000" currency="PYG" required onChange={value=>changed.push(value)}/>);
let input=renderer.root.findByType('input');
assert.equal(input.props.value,'4.000.000','PYG agrupa miles');
assert.equal(input.props.inputMode,'numeric','PYG usa teclado numérico');
assert.equal(input.props.required,true,'el requerido llega al control');
assert.ok(prefixOf(renderer).includes('Gs'),'PYG dibuja su símbolo');
act(()=>input.props.onChange({currentTarget:{value:'4.000.000,50',selectionStart:12}}));
assert.equal(changed.at(-1),'4000000','PYG no admite centavos');
act(()=>input.props.onChange({currentTarget:{value:'1.234',selectionStart:5}}));
assert.equal(changed.at(-1),'1234');
renderer.update(<AmountInput value="1250" currency="USD" onChange={value=>changed.push(value)}/>);
input=renderer.root.findByType('input');
assert.equal(input.props.value,'1.250,00','el resto de las monedas conserva dos decimales');
assert.equal(input.props.inputMode,'decimal');
assert.ok(prefixOf(renderer).includes('US$'),'USD dibuja su símbolo');
act(()=>input.props.onChange({currentTarget:{value:'1,234.50',selectionStart:8}}));
assert.equal(changed.at(-1),'1234.50','el pegado en-US se normaliza');
act(()=>input.props.onChange({currentTarget:{value:'1,234',selectionStart:5}}));
assert.equal(changed.at(-1),'1234');
renderer.update(<AmountInput value="1234.5" currency="EUR" onChange={value=>changed.push(value)}/>);
input=renderer.root.findByType('input');
assert.equal(input.props.value,'1.234,50');
act(()=>input.props.onChange({currentTarget:{value:'1.234,50',selectionStart:8}}));
assert.equal(changed.at(-1),'1234.50','el pegado es-PY se normaliza');
renderer.update(<AmountInput integerOnly value="1500" currency="BRL" onChange={value=>changed.push(value)}/>);
input=renderer.root.findByType('input');
assert.equal(input.props.inputMode,'numeric','integerOnly fuerza teclado entero');
assert.equal(input.props.value,'1.500');
assert.ok(prefixOf(renderer).includes('R$'),'BRL dibuja su símbolo');
assert.ok(prefixOf(create(<AmountInput value="1" currency="MXN" onChange={()=>{}}/>)).includes('MX$'),'MXN conserva su símbolo propio');
renderer.unmount();
console.log('PASS: el campo de monto puentea MoneyInput (agrupación, centavos, enteros, pegado es-PY/en-US, requerido y símbolos por moneda)');
