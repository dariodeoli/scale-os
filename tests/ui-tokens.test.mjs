import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import postcss from 'postcss';
import {themeTokens,hexColor} from './helpers/ui-token-values.mjs';
const read=name=>readFileSync(new URL(`../app/${name}`,import.meta.url),'utf8');
test('legacy and object channels resolve to the same semantic roles in every theme',()=>{
 for(const theme of ['light','dark','contrast']){
  const values=themeTokens(theme);
  for(const [legacy,object] of [['canvas','paper'],['surface','ink'],['brand-700','fono'],['success','ok'],['danger','bad'],['warning','warn'],['info','info'],['border-interactive','interactivo']]){
   assert.equal(hexColor(values[`--${legacy}`]),hexColor(values[`--c-${object}`]),`${theme}: ${legacy}/${object}`);
  }
  for(const role of ['brand','success','danger','warning'])assert.doesNotMatch(values[`--on-${role}`],/var\(/);
 }
 assert.equal(hexColor(themeTokens('dark')['--border-interactive']),'#867493','preserve the effective AA dark boundary, not the superseded value');
 assert.equal(themeTokens('light')['--c-pass'],undefined,'do not shadow a dependency token absent from the old local light palette');
});
test('contrast shell is wholly black; focus uses a solid semantic role',()=>{
 const high=themeTokens('contrast');
 assert.equal(high['--ui-shell-canvas'],'linear-gradient(180deg,rgb(0 0 0) 0%,rgb(0 0 0) 360px)');
 assert.equal(hexColor(high['--focus-ring']),'#ffd400');
 assert.doesNotMatch(read('qa-fixes.css'),/outline:\s*3px solid var\(--focus-halo\)/);
});
test('global semantic definitions have one owner; scope and hidden tab contract remain',()=>{
 for(const name of ['globals.css','ui-system.css','tailwind.css','contrast.css'])postcss.parse(read(name)).walkRules(rule=>{
  if(rule.selector!==':root'&&!['html[data-theme="dark"]','html[data-theme="contrast"]'].includes(rule.selector))return;
  rule.walkDecls(declaration=>assert(!declaration.prop.startsWith('--'),`${name} still owns global token ${declaration.prop}`));
 });
 const layout=read('layout.tsx');
 assert(layout.indexOf("import 'owncoding-ui/styles.css'")<layout.indexOf("import './ui-tokens.css'"));
 assert(layout.indexOf("import './ui-tokens.css'")<layout.indexOf("import './globals.css'"));
 assert.match(read('ui-system.css'),/\.person-sheet \[data-sheet-tab\]\[hidden\]\{display:none\}/);
 assert.doesNotMatch(read('ui-tokens.css'),/@media\([^)]*var\(/,'breakpoints cannot use runtime custom properties');
});
test('density retains the existing threshold contracts without inventing a breakpoint variable',()=>{
 for(const [width,height,gutter] of [[390,'44px','16px'],[760,'44px','16px'],[761,'40px','16px'],[767,'40px','16px'],[768,'40px','24px'],[1280,'40px','32px']]){
  const values=themeTokens('light',width);assert.equal(values['--ui-control-height'],height);assert.equal(values['--ui-page-padding'],gutter);
 }
});
