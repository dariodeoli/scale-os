import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss,{type Rule,type AnyNode} from 'postcss';
import {selectPosition} from '../app/select-position';

const root=postcss.parse(readFileSync(new URL('../app/mobile-forms.css',import.meta.url),'utf8'));
const globalsRoot=postcss.parse(readFileSync(new URL('../app/globals.css',import.meta.url),'utf8'));
// Inspect stylesheet contracts at the supported widths. This is not a browser
// layout engine and does not prove rendered pixels or physical touch behavior.
function declarations(sheet:typeof root,selector:string,width:number){
 const values:Record<string,string>={};
 sheet.walkRules((rule:Rule)=>{
  if(!rule.selectors.includes(selector))return;
  for(let parent:AnyNode|undefined=rule.parent;parent;parent=parent.parent){
   if(parent.type==='atrule'&&parent.name==='media'){
    const max=/max-width:(\d+)px/.exec(parent.params);if(max&&width>Number(max[1]))return;
   }
  }
  rule.walkDecls(d=>{values[d.prop]=d.value;});
 });return values;
}
assert(readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8').includes("import './mobile-forms.css'"));
for(const width of [768,1024]){
 const page=declarations(globalsRoot,'.login-page',width);
 const card=declarations(globalsRoot,'.login-card',width);
 assert.equal(page['block-size'],'100dvh');
 assert.equal(page.overflow,'hidden');
 assert.equal(card['max-block-size'],'calc(100dvh - 48px)');
 assert.equal(card['overflow-y'],'auto');
 assert.equal(card['overscroll-behavior'],'contain');
 assert.equal(card['scroll-padding'],'24px');
}
for(const width of [320,360,390,540,760]){
 const card=declarations(root,'.login-page .login-card',width);
 assert.equal(card['max-block-size'],'calc(100dvh - 32px)');
}
for(const width of [320,360,390,540,760]){
 assert.equal(declarations(root,'.login-page',width)['grid-template-columns'],'minmax(0,1fr)');
 assert.equal(declarations(root,'.login-page .login-card',width)['overflow-wrap'],'anywhere');
 assert.equal(declarations(root,'.dialog-body fieldset',width)['min-width'],'0');
 for(const selector of ['.dialog-body select','.dialog-body textarea','.login-card input']){
  assert.equal(declarations(root,selector,width)['min-height'],'44px');assert.equal(declarations(root,selector,width)['font-size'],'16px');
 }
 assert.equal(declarations(root,'.dialog-heading .icon-button',width).width,'44px');
 assert.equal(declarations(root,'.dialog-footer .dialog-actions>button',width)['max-width'],'100%');
}
for(const width of [768,1024])assert.equal(declarations(root,'.dialog-body select',width)['min-height'],undefined,'desktop form density unchanged');
for(const width of [320,360,390,540,760,768])for(const height of [320,568,844])for(const top of [12,140,height-60]){
 const p=selectPosition({top,bottom:top+44,left:width-100,width:350},{width,height});
 assert(p.left>=12);assert(p.left+p.width<=width-12);assert(p.maxHeight>=0);assert(p.maxHeight<=380);
 if(p.top!==undefined)assert(p.top+p.maxHeight<=height-12);
 if(p.bottom!==undefined)assert(p.bottom+p.maxHeight<=height-12);
}
console.log('PASS: viewport-bounded authentication shell contracts, shared mobile form CSS at 320/360/390/540/760, unchanged desktop sizing, and 54 dropdown viewport positions; not visual browser QA');
