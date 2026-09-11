import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';

const css=name=>postcss.parse(readFileSync(new URL(`../app/${name}.css`,import.meta.url),'utf8'));
const inventory=css('inventory-workspace'),forecast=css('financial-forecast');
// Static, module-local CSS contracts only: not a browser cascade/layout engine.
// Exact selectors avoid pretending to resolve inheritance or native controls.
function value(sheet,selector,property,width){
 let result;
 sheet.walkRules(rule=>{
  if(!rule.selectors.includes(selector))return;
  for(let parent=rule.parent;parent;parent=parent.parent){
   if(parent.type!=='atrule')continue;
   assert.equal(parent.name,'media','extend this test explicitly for new at-rules');
   const match=parent.params.match(/^\((min|max)-width:\s*(\d+)px\)$/);
   assert(match,`Unsupported media query: ${parent.params}`);
   if(match[1]==='max'?width>Number(match[2]):width<Number(match[2]))return;
  }
  rule.walkDecls(property,decl=>{result=decl.value;});
 });
 return result;
}
for(const width of [320,360,390,768]){
 const get=(selector,property)=>value(inventory,selector,property,width);
 assert.equal(get('.inventory-form-grid','grid-template-columns'),width<=620?'minmax(0,1fr)':'repeat(2,minmax(0,1fr))');
 assert.equal(get('.inventory-calendar-grid','grid-template-columns'),'minmax(0,1fr)',`${width}px must use a readable calendar list, including tablet with sidebar`);
 assert.equal(get('.inventory-weekdays','display'),'none');
 assert.equal(get('.inventory-calendar-event','min-width'),'0','event may shrink below its preferred basis');
 assert.equal(get('.inventory-calendar-event','flex'),'1 1 130px');
 for(const selector of ['.inventory-form-grid','.inventory-equipment','.inventory-reservation','.inventory-categories>button']){
  assert.equal(get(selector,'overflow-wrap'),'anywhere',`${selector}: long names/serials must wrap`);
  assert.equal(get(selector,'min-width'),'0');
 }
 assert.equal(get('.inventory-check>span','min-width'),'0');
 assert.equal(get('.inventory-form-grid legend','max-width'),'100%');
 assert.equal(get('.inventory-categories>button','max-width'),'100%');
 assert.equal(get('.inventory-categories>button','white-space'),'normal');
 assert.equal(get('.inventory-form-grid .inventory-check input','padding'),'0','18px checkboxes must not inherit text-input padding');
 for(const selector of ['.inventory-form-grid input','.inventory-form-grid select','.inventory-form-grid textarea']){
  assert.equal(get(selector,'min-width'),'0');assert.equal(get(selector,'max-width'),'100%');assert(Number.parseFloat(get(selector,'min-height'))>=44,'touch control height is at least 44px');
 }
 assert.equal(get('.inventory-month input','max-width'),'100%');
 const money=(selector,property)=>value(forecast,selector,property,width);
 assert.equal(money('.financial-forecast .panel-heading label','flex-wrap'),'wrap');
 assert.equal(money('.financial-forecast input','min-width'),'0');
 assert.equal(money('.financial-forecast input','max-width'),'min(100%,12rem)');
 for(const selector of ['.forecast-currency dt','.forecast-currency dd']){
  assert.equal(money(selector,'min-width'),'0');assert.equal(money(selector,'max-width'),'100%');assert.equal(money(selector,'overflow-wrap'),'anywhere');
 }
 console.log(`PASS ${width}px: static CSS contracts for forms, long text, calendar, month controls and financial amounts`);
}
assert.equal(value(inventory,'.inventory-calendar-grid','grid-template-columns',769),'repeat(7,minmax(0,1fr))','desktop calendar retained');
assert.equal(value(inventory,'.inventory-form-grid','grid-template-columns',1100),'repeat(3,minmax(0,1fr))','wide form density retained');
console.log('No browser, localhost, rendering or pixel measurements; native mobile controls and visual fit remain unverified.');
