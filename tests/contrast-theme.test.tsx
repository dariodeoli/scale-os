import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const contrast=read('app/contrast.css');
const tailwind=read('app/tailwind.css');
const globals=read('app/globals.css');

/** Tokens declarados dentro del bloque de un selector. */
function tokens(css:string,selector:string){
 const start=css.indexOf(selector);assert(start>=0,`el CSS declara ${selector}`);
 const open=css.indexOf('{',start),close=css.indexOf('}',open);
 return new Set([...css.slice(open,close).matchAll(/--([a-z0-9-]+)\s*:/g)].map(match=>match[1]!));
}

// ── Medición WCAG sobre los tokens declarados (alto contraste) ──────────────
const hex=(value:string)=>[1,3,5].map(index=>Number.parseInt(value.slice(index,index+2),16));
const triplet=(value:string)=>value.trim().split(/\s+/).map(Number);
const lum=(rgb:number[])=>{const [r,g,b]=rgb.map(value=>{const channel=(value??0)/255;return channel<=0.03928?channel/12.92:((channel+0.055)/1.055)**2.4;});return 0.2126*r!+0.7152*g!+0.0722*b!;};
const ratio=(a:number[],b:number[])=>{const [one,two]=[lum(a),lum(b)].sort((x,y)=>y-x) as [number,number];return (one+0.05)/(two+0.05);};
const legacy=(name:string)=>{const match=contrast.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));assert(match,`contrast.css declara --${name}`);return hex(match![1]);};
const v2=(name:string)=>{const match=contrast.match(new RegExp(`--c-${name}:\\s*([\\d ]+)`));assert(match,`contrast.css declara --c-${name}`);return triplet(match![1]);};
const near=(value:number,minimum:number,label:string)=>assert(value>=minimum,`${label}: ${value.toFixed(2)}:1 (mínimo ${minimum}:1)`);

test('alto contraste: texto AAA, bordes y marca por encima de AA',()=>{
 near(ratio(legacy('text'),legacy('canvas')),7,'texto sobre lienzo');
 near(ratio(legacy('text-muted'),legacy('surface')),7,'texto secundario sobre superficie');
 near(ratio(legacy('text-muted'),legacy('surface-subtle')),7,'texto secundario sobre superficie suave');
 near(ratio(legacy('line-strong'),legacy('surface')),3,'borde de control sobre superficie');
 near(ratio(legacy('brand-700'),legacy('canvas')),4.5,'marca como texto/enlace');
 near(ratio(legacy('focus-ring'),legacy('canvas')),3,'anillo de foco');
 near(ratio(v2('fore'),v2('paper')),7,'texto v2 sobre lienzo');
 near(ratio(v2('fore'),v2('ink-800')),7,'texto v2 sobre superficie elevada');
 near(ratio(v2('mute'),v2('ink-800')),4.5,'texto secundario v2');
 near(ratio(v2('ink-500'),v2('ink-800')),3,'borde v2');
 near(ratio(v2('onbrand'),v2('fono')),4.5,'tinta sobre marca');
 for(const role of ['ok','warn','bad','info','fono','pass'])near(ratio(v2(`${role}-text`),v2('ink-800')),4.5,`chip ${role}`);
});

test('el tercer tema declara la misma familia de tokens que claro y oscuro',()=>{
 const darkV2=tokens(tailwind,'html[data-theme="dark"]');
 const contrastV2=tokens(contrast,'html[data-theme="contrast"]');
 const darkLegacy=tokens(globals,'html[data-theme="dark"]');
 const contrastLegacy=tokens(contrast,'html[data-theme="contrast"]');
 for(const token of darkV2)if(token.startsWith('c-'))assert(contrastV2.has(token),`el alto contraste declara --${token}`);
 for(const token of darkLegacy)if(!token.startsWith('c-')&&!['shadow','focus-halo','color-scheme'].some(prefix=>token.startsWith(prefix)))assert(contrastLegacy.has(token),`el alto contraste declara --${token}`);
 assert(tokens(tailwind,':root').size>10,'la paleta clara sigue declarada');
 assert(read('app/layout.tsx').includes("import './contrast.css'"),'el layout carga el tema de alto contraste');
 assert(!/--c-[a-z-]+:\s*#[0-9a-f]{6}/i.test(contrast),'los tokens v2 usan canales RGB como el resto de la app');
});

test('el control de tema cicla claro → oscuro → alto contraste y lo persiste',async()=>{
 const {ThemeToggle,TEMAS,siguienteTema}=require('../app/theme-toggle') as typeof import('../app/theme-toggle');
 assert.deepEqual(TEMAS,['light','dark','contrast']);
 assert.equal(siguienteTema('light'),'dark');assert.equal(siguienteTema('dark'),'contrast');assert.equal(siguienteTema('contrast'),'light');
 const stored:Record<string,string>={};
 const element={dataset:{} as Record<string,string>,removeAttribute:()=>{delete element.dataset.theme;}};
 const document={documentElement:element};
 Object.assign(globalThis,{document,localStorage:{getItem:(key:string)=>stored[key]??null,setItem:(key:string,value:string)=>{stored[key]=value;}}});
 const setTheme=(value:string)=>{if(value==='light')delete element.dataset.theme;else element.dataset.theme=value;};
 for(const [inicial,esperado] of [['light','dark'],['dark','contrast'],['contrast','light']] as [string,string][]){
  setTheme(inicial);
  let renderer:any;
  await act(async()=>{renderer=create(<ThemeToggle/>);});
  const button=renderer.root.findAllByType('button')[0]!;
  const etiqueta=inicial==='light'?'Tema claro':inicial==='dark'?'Tema oscuro':'Alto contraste';
  assert(String(button.props['aria-label']).includes(etiqueta),'el control nombra el tema vigente');
  await act(async()=>button.props.onClick());
  assert.equal(element.dataset.theme===undefined?'light':element.dataset.theme,esperado,`clic desde ${inicial}`);
  assert.equal(stored['scale-theme'],esperado,'la preferencia se persiste');
  await act(()=>renderer.unmount());
 }
});

// ── Adopción owncoding-ui v0.59.0 (#124): guardas del mapeo de Scale OS ─────
// La biblioteca mide su propia paleta; acá se mide la paleta de Scale OS sobre
// sus tintes y pares reales, que es lo que el handover de owncoding-ui#13 dejó
// del lado de la app.
const sobre=(color:number[],alfa:number,fondo:number[])=>color.map((valor,indice)=>valor*alfa+fondo[indice]*(1-alfa));
const bloquesDeTokens=(css:string,apertura:string)=>{
 for(let index=css.indexOf(apertura);index>=0;index=css.indexOf(apertura,index+1)){
  const open=css.indexOf('{',index),close=css.indexOf('}',open);
  const bloque=css.slice(open,close);
  if(/--c-paper:/.test(bloque))return bloque;
 }
 throw new Error(`sin bloque de tokens para ${apertura}`);
};
const tokenDe=(bloque:string,nombre:string)=>{
 const match=bloque.match(new RegExp(`--c-${nombre}:\\s*([\\d ]+)\\s*;`));
 if(!match)throw new Error(`falta --c-${nombre}`);
 return match[1].trim().split(/\s+/).map(Number);
};

test('chips, botones llenos y enlaces AA en claro y oscuro (owncoding-ui #13)',()=>{
 const claro=bloquesDeTokens(tailwind,':root {');
 const oscuro=bloquesDeTokens(tailwind,'html[data-theme="dark"] {');
 const paletas=[
  {tema:'claro',bloque:claro,fondos:[tokenDe(claro,'ink'),tokenDe(claro,'paper'),tokenDe(claro,'ink-800')]},
  {tema:'oscuro',bloque:oscuro,fondos:[tokenDe(oscuro,'ink'),tokenDe(oscuro,'paper'),tokenDe(oscuro,'ink-800')]},
 ];
 // Chips: la familia `*-text` (la que usan Badge/ChipEstado en v0.59) sobre el
 // tinte 15 % y 10 % de su tono base en cada superficie.
 for(const {tema,bloque,fondos} of paletas)for(const tono of ['ok','warn','bad','info','fono']){
  const texto=tokenDe(bloque,`${tono}-text`),base=tokenDe(bloque,tono);
  for(const alfa of [0.15,0.10])for(const fondo of fondos)near(ratio(texto,sobre(base,alfa,fondo)),4.5,`${tema}: chip ${tono}-text sobre ${tono} ${alfa*100} %`);
 }
 // `pass` hereda el relleno de la librería (Scale OS sólo mapea su texto).
 const passBase=[22,197,94];
 near(ratio(tokenDe(claro,'pass-text'),sobre(passBase,0.15,tokenDe(claro,'ink'))),4.5,'claro: chip pass-text sobre el tinte de la librería');
 near(ratio(tokenDe(oscuro,'pass-text'),sobre(passBase,0.15,tokenDe(oscuro,'ink-800'))),4.5,'oscuro: chip pass-text sobre el tinte de la librería');
 // Botones llenos (v0.59): el par viaja con el relleno.
 for(const {tema,bloque} of paletas){
  near(ratio(tokenDe(bloque,'onbrand'),tokenDe(bloque,'fono')),4.5,`${tema}: texto sobre marca`);
  near(ratio(tokenDe(bloque,'on-ok'),tokenDe(bloque,'ok')),4.5,`${tema}: texto sobre ok (Button success)`);
  near(ratio(tokenDe(bloque,'on-bad'),tokenDe(bloque,'bad')),4.5,`${tema}: texto sobre bad (Button danger)`);
 }
 // EnlaceLinea pinta `text-fono-light` (v0.59): AA sobre lienzo y paneles.
 near(ratio(tokenDe(claro,'fono-light'),tokenDe(claro,'paper')),4.5,'claro: enlace sobre lienzo');
 near(ratio(tokenDe(claro,'fono-light'),tokenDe(claro,'ink')),4.5,'claro: enlace sobre panel');
 near(ratio(tokenDe(oscuro,'fono-light'),tokenDe(oscuro,'ink')),4.5,'oscuro: enlace sobre panel');
 near(ratio(tokenDe(oscuro,'fono-light'),tokenDe(oscuro,'paper')),4.5,'oscuro: enlace sobre lienzo');
 // Pie del riel de Scale OS (riel oscuro propio, no `NavLateral`): el texto
 // blanco al 78 %/72 % sobre los extremos del gradiente se mantiene AA.
 const rieles=[[46,0,56],[37,0,47],[10,10,14],[16,16,22]];
 for(const fondo of rieles)for(const alfa of [0.78,0.72])near(ratio(sobre([255,255,255],alfa,fondo),fondo),4.5,`pie del riel ${alfa*100} %`);
});

// ── Texto secundario y chips neutros (#137) ─────────────────────────────────
// La auditoría pidió revisar el contraste del texto secundario y de los chips
// suaves con las guardas existentes. Acá se mide el par real de Scale OS.
test('texto secundario y chip neutro sostienen AA en claro y oscuro (#137)',()=>{
 const claro=bloquesDeTokens(tailwind,':root {');
 const oscuro=bloquesDeTokens(tailwind,'html[data-theme="dark"] {');
 for(const [tema,bloque] of [['claro',claro],['oscuro',oscuro]] as const){
  for(const fondo of ['paper','ink','ink-800','ink-700','ink-900','ink-950']){
   near(ratio(tokenDe(bloque,'mute'),tokenDe(bloque,fondo)),4.5,`${tema}: texto secundario sobre ${fondo}`);
  }
 }
 // Claro: el chip neutro de la librería pinta `text-mute` sobre `bg-ink-600`.
 near(ratio(tokenDe(claro,'mute'),tokenDe(claro,'ink-600')),4.5,'claro: chip neutro');
 // Oscuro: `mute` sobre `ink-600` da 4.21:1 (bajo AA); `StateChip` sube el texto
 // a primer nivel y el par vuelve a pasar.
 const ui=read('app/ui-v2.tsx');
 assert.match(ui,/tone === 'mute' \? 'dark:text-fore'/,'StateChip mute usa texto de primer nivel en oscuro');
 near(ratio(tokenDe(oscuro,'fore'),tokenDe(oscuro,'ink-600')),4.5,'oscuro: chip neutro');
});
