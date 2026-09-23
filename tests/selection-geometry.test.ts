import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(new URL(`../app/${name}`,import.meta.url),'utf8');
const control=read('control-center.css');
const workspace=read('scale-workspace.tsx');
const rail=read('desktop-sidebar.tsx');
const drawer=read('mobile-navigation.tsx');
// Structural regression guard; actual before/after dimensions are checked in Chrome.
// El riel y el drawer comparten UNA constante de geometría (RAIL_ITEM) y el
// estado activo sólo cambia color: la selección nunca cambia métricas.
assert.match(rail,/export const RAIL_ITEM='[^']*min-h-11[^']*font-semibold[^']*'/,'the rail item reserves touch target and font metrics');
assert.match(workspace,/navItemClass=\(active:boolean\)=>/,'the shell composes one item class');
assert.match(workspace,/active\?'bg-fono\/10 text-fono-light':'text-mute hover:bg-ink-700 hover:text-fore'/,'selection changes color only, never geometry');
assert(workspace.includes('navItemClass(activeParent === label)')&&workspace.includes('navItemClass(false)'),'links and the logout button share the item class');
assert.match(drawer,/\[&_a\]:min-h-11 \[&_button\]:min-h-11/,'the mobile drawer keeps 44px targets for links and buttons');
// Los tabs de apartados conservan su geometría base en la hoja compartida.
const tabs='.control-shell .section-tabs>a';
const start=control.indexOf(`${tabs}{`)>=0?control.indexOf(`${tabs}{`):control.indexOf(`${tabs},`);
assert(start>=0,'section tabs rule exists');
const base=control.slice(start).split('}')[0];
assert(base.includes('font-weight:700'),'section tabs reserve the same font metrics before selection');
const state=control.slice(control.indexOf(`${tabs}[aria-current=page]{`)).split('}')[0];
assert(!/font-weight|font-size|padding|line-height|border-width/.test(state),'tab selection must not change geometry');
assert(control.includes('nav>a svg{flex:none}'));
assert(read('qa-fixes.css').includes('.choice{font-weight:600}'));
console.log('PASS: rail, drawer, tabs and choice selection keep stable font metrics');
