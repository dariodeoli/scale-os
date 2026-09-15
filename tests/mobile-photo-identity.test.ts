import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import postcss from 'postcss';

// CSS contract and geometry checks only: no DOM layout engine/browser is used.
const sheet=(name:string)=>postcss.parse(readFileSync(new URL(`../app/${name}`,import.meta.url),'utf8'));
const photos=sheet('photo-cropper.css'),actors=sheet('actor-identity.css'),assignees=sheet('assignee-picker.css');
function declarations(root:ReturnType<typeof sheet>,selector:string,media=''){
 const values:Record<string,string>={};
 root.walkRules(rule=>{
  const parent=rule.parent;
  const condition=parent?.type==='atrule'&&parent.name==='media'?parent.params:'';
  if(rule.selectors.includes(selector)&&condition===media)rule.walkDecls(d=>{values[d.prop]=d.value;});
 });
 return values;
}
const touch='(max-width:540px), (pointer:coarse)';
test('photo controls reserve 44px touch targets at 320/360/390 without widening the form',()=>{
 for(const width of [320,360,390]){
  assert(width<=540);
  // Existing mobile dialog contract: 10px overlay + 16px body padding each side;
  // the photo field adds its own 16px padding and 1px border on each side.
  const photoWidth=width-20-32-34;
  for(const selector of ['.profile-photo-form .text-button','.profile-photo-form .photo-upload','.crop-zoom input','.ops-dialog.unified-dialog:has(.profile-crop-stage) .quick-actions .text-button']){
   const style=declarations(photos,selector,touch);
   assert.equal(style['min-height'],'44px',`${selector} at ${width}px`);
   assert.equal(style['min-width'],'44px');assert(Number.parseFloat(style['min-width'])<photoWidth);
  }
 }
 assert.equal(declarations(photos,'.profile-photo-controls')['flex-wrap'],'wrap');
 assert.equal(declarations(photos,'.crop-zoom input').width,'100%');
});
test('short-height crop does not retain a 180px floor; portrait crop stays capped',()=>{
 const base=declarations(photos,'.profile-crop-stage');
 assert.equal(base.height,'min(42dvh,320px)');assert.equal(base['touch-action'],'none');assert.equal(base.overflow,'hidden');
 const short=declarations(photos,'.profile-crop-stage','(max-height:500px)');
 assert.equal(short.height,'min(42dvh,180px)');assert.equal(short['min-height'],'120px');
 for(const width of [320,360,390])for(const height of [320,360,390,568,640,844]){
  const cropHeight=height<=500?Math.max(120,Math.min(height*.42,180)):Math.max(180,Math.min(height*.42,320));
  assert(cropHeight<=height*.42,`${width}×${height}: crop exceeds its viewport budget`);
  assert(cropHeight<height-20,'The crop alone must not fill the dialog');
 }
});
test('assignee checkboxes do not inherit text-input padding; labels retain touch area',()=>{
 const box=declarations(assignees,'.assignee-picker .assignee-option input[type=checkbox]');
 assert.equal(box.padding,'0','Global inputs have 10px 12px padding, larger than an 18px checkbox');
 assert.equal(box.width,'18px');assert.equal(box.height,'18px');assert.equal(box.flex,'0 0 18px');
 assert.equal(declarations(assignees,'.assignee-picker .assignee-option')['min-height'],'44px');
 // The list wraps whole chips; names inside each compact chip use ellipsis.
 assert.equal(declarations(assignees,'.assignee-picker .assignee-selected')['flex-wrap'],'wrap');
  const chip=declarations(assignees,'.assignee-picker .assignee-selected li');
  assert.equal(chip.display,'inline-flex');assert.equal(chip['min-width'],'0');assert.equal(chip['max-width'],'100%');
  const name=declarations(assignees,'.assignee-picker .assignee-selected li>.person-container');
  assert.equal(name['min-width'],'0');assert.equal(name['max-width'],'280px');
  const personName=declarations(sheet('person-container.css'),'.person-container-name');
  assert.equal(personName.overflow,'hidden');
  assert.equal(personName['text-overflow'],'ellipsis');assert.equal(personName['white-space'],'nowrap');
  assert.equal(declarations(assignees,'.assignee-picker .assignee-option .person-container')['min-width'],'0');
 assert.equal(declarations(assignees,'.assignee-picker .assignee-options')['overflow-y'],'auto');
});
test('chip remove actions stay compact on desktop and reserve 44px on mobile or coarse pointers',()=>{
 const selector='.assignee-picker .assignee-remove';
 const desktop=declarations(assignees,selector);
 assert.equal(desktop.width,'28px');assert.equal(desktop.height,'28px');assert.equal(desktop.flex,'none');
 const mobile=declarations(assignees,selector,'(max-width:760px), (pointer:coarse)');
 for(const property of ['width','height','min-width','min-height'])assert.equal(mobile[property],'44px');
 // Contract geometry only: dialog overlay/body + picker padding/border + chip
 // padding/border/gaps must still leave space for the name and primary action.
 for(const width of [320,360,390,540,760]){
  const available=width-20-32-26-15-10-Number.parseFloat(mobile.width);
  assert(available>=173,'the fixed remove target must leave room for shrinking chip content');
 }
});
test('actor names already wrap without shrinking the avatar or truncating the name',()=>{
 const actor=declarations(actors,'.actor-identity'),name=declarations(actors,'.actor-identity-name'),avatar=declarations(actors,'.actor-identity-avatar');
 assert.equal(actor['min-width'],'0');assert.equal(actor['max-width'],'100%');
 assert.equal(name['min-width'],'0');assert.equal(name['overflow-wrap'],'anywhere');assert.notEqual(name['white-space'],'nowrap');
 assert.equal(avatar.flex,'0 0 2rem');assert.equal(declarations(actors,'.actor-identity-avatar img')['object-fit'],'cover');
 for(const width of [320,360,390])assert(width-20-32-32-8.8>0,'Avatar/gap leave positive wrapping space at each target width');
});
