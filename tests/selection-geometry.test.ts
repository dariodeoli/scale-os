import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(new URL(`../app/${name}`,import.meta.url),'utf8');
const control=read('control-center.css');
const mobile=read('mobile-navigation.css');
// Structural regression guard; actual before/after dimensions are checked in Chrome.
for(const [css,selector] of [[control,'.control-shell>aside nav>a'],[mobile,'.mobile-sidebar nav>a'],[control,'.control-shell .section-tabs>a']] as const){
  // El riel comparte la geometría con el botón de cerrar sesión: el selector puede venir en una lista.
  const start=[`${selector}{`,`${selector},`].map(needle=>css.indexOf(needle)).filter(index=>index>=0).sort((a,b)=>a-b)[0];
  assert(start!==undefined,`${selector}: rule exists`);
  const base=css.slice(start).split('}')[0];
  assert(base.includes(`font-weight:${selector.includes('section-tabs')?'700':'600'}`),`${selector}: reserve the same font metrics before selection`);
 const active=selector.includes('section-tabs')?`${selector}[aria-current=page]`:`${selector}.active`;
 const state=css.slice(css.indexOf(`${active}{`)).split('}')[0];
 assert(!/font-weight|font-size|padding|line-height|border-width/.test(state),`${selector}: selection must not change geometry`);
}
assert(control.includes('nav>a svg{flex:none}'));
assert(read('qa-fixes.css').includes('.choice{font-weight:600}'));
console.log('PASS: sidebar, mobile drawer, tabs and choice selection keep stable font metrics');
