import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
const css=readFileSync('app/ui-system.css','utf8'),ast=postcss.parse(css);
assert(readFileSync('app/layout.tsx','utf8').includes("import './ui-system.css'"));
const tokens={};ast.walkRules(':root',rule=>{if(rule.parent.type==='root')rule.walkDecls(d=>tokens[d.prop]=d.value);});
const foundation={};postcss.parse(readFileSync('app/globals.css','utf8')).walkRules(':root',rule=>{if(rule.parent.type==='root')rule.walkDecls(d=>foundation[d.prop]=d.value);});
function resolveToken(value){let current=value,seen=new Set();while(current.startsWith('var(--')&&!seen.has(current)){seen.add(current);const name=current.slice(4,-1);const next=tokens[name]??foundation[name];if(!next)break;current=next;}return current;}
assert.deepEqual([1,2,3,4,5,6].map(n=>tokens[`--ui-space-${n}`]),['4px','8px','12px','16px','20px','24px']);
assert.equal(tokens['--ui-control-height'],'40px');
assert(css.includes('--ui-control-height:44px'));
function luminance(hex){const c=hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
for(const background of ['#ffffff','#fbfafc']){const light=luminance(background),dark=luminance(resolveToken(tokens['--ui-field-border']));assert((light+.05)/(dark+.05)>=3,'input boundaries need sufficient contrast');}
assert(css.includes('.control-shell .panel .panel{padding:0;border:0;box-shadow:none}'));
assert(css.includes('.control-shell :is(.ops-stack,.finance-grid)>.panel+.panel{margin-top:0}'));
assert(css.includes('.control-shell .production-panel,.control-shell .production-focus{padding:0;border:0;background:transparent}'));
assert(css.includes('font-variant-numeric:tabular-nums'));
assert(css.includes('.quote-preview{position:static;top:auto;width:auto;height:auto;display:block;min-width:0;max-width:100%'),'document aside must not inherit sidebar height/width/stickiness');
assert(css.includes('.quote-item{grid-template-columns:var(--ui-control-height) minmax(0,1fr)}'),'drag handle track must fit standardized button');
assert(css.includes('.quote-preview .payment-row>b{flex:0 0 auto;max-width:100%;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere'),'preview totals stay readable in portal dialogs');
assert(css.includes('[aria-invalid=true]'));assert(css.includes('prefers-reduced-motion:reduce'));
ast.walkRules(rule=>{
 if(/\.active|:hover|:focus-visible/.test(rule.selector))rule.walkDecls(d=>assert(!/^(font-size|font-weight|padding|width|height|border-width)$/.test(d.prop),`state changes geometry: ${rule.selector} ${d.prop}`));
});
for(const viewport of [320,360,390,768]){
 assert(css.includes('min-width:0;max-width:100%'));assert(css.includes('white-space:normal'));
 console.log(`PASS ${viewport}px source contracts: shrinkable fields, wrapping actions, shared surfaces; not visual viewport QA`);
}
