import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import postcss from 'postcss';
import {legacyButtonCss} from './helpers/legacy-button-css.mjs';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const rules=file=>{const values=[];postcss.parse(read(file)).walkRules(rule=>values.push(rule));return values;};
const decls=rule=>Object.fromEntries(rule.nodes.filter(node=>node.type==='decl').map(node=>[node.prop,node.value]));
test('retained legacy classes do not own canonical Button presentation',()=>{
 for(const [file,selector,property] of [
  ['app/globals.css','.login-card .primary:not(:where([data-ui-button]))','min-height'],
  ['app/globals.css','.google-login-button:not(:where([data-ui-button]))','background'],
  ['app/qa-fixes.css','.secondary:not(:where([data-ui-button]))','padding'],
  ['app/cliente/portal.css','.client-portal button:not(:where([data-ui-button]))','background'],
  ['app/superadmin/platform-admin.css','.platform-admin-actions :is(.secondary):not(:where([data-ui-button]))','padding'],
  ['app/finance-balance.css','.finance-detail-actions>button:not(:where([data-ui-button]))','height'],
 ]){
  assert(rules(file).some(rule=>rule.selectors.includes(selector)&&property in decls(rule)),`${file}: legacy ${selector} still works without taking ownership of Button`);
 }
});
test('every Button variant and size explicitly owns its visual contract',()=>{
 const ui=rules('app/ui-system.css');
 for(const variant of ['primary','secondary','outline','ghost','danger']){
  const rule=ui.find(rule=>rule.selectors.includes(`[data-ui-button][data-ui-variant=${variant}]`)&&'background' in decls(rule));
  assert(rule,`${variant} owns its background`);assert('color' in decls(rule),`${variant} owns its foreground`);
 }
 for(const size of ['compact','medium','large'])assert(ui.some(rule=>rule.selectors.includes(`[data-ui-button][data-ui-size=${size}]`)&&'padding' in decls(rule)),`${size} owns padding`);
 for(const rule of ui)if(rule.selector.includes('[data-ui-button]')&&!rule.selector.includes(':not(:where([data-ui-button]))'))rule.walkDecls(declaration=>assert.equal(declaration.important,undefined,'canonical Button does not use !important'));
 assert.doesNotMatch(read('app/ui-system.css'),/data-ui-button-label/,'direct child anatomy has no orphan label hook');
});
test('layout rules and field/tab invariants remain independent of button styling',()=>{
 const child=rules('app/client-identity.css').find(rule=>rule.selector==='.profile-footer .user b');assert.equal(decls(child)['white-space'],'nowrap','rich child layout is preserved when its parent becomes Button');
 const globals=rules('app/globals.css');assert(globals.some(rule=>rule.selector==='.login-button'&&decls(rule).width==='100%'));
 const ui=read('app/ui-system.css');assert.match(ui,/\.ui-form-fields\{display:contents;border:0;margin:0;padding:0;min-width:0\}/);
 assert.match(ui,/\.person-sheet \[data-sheet-tab\]\[hidden\]\{display:none\}/);
 const actions=rules('app/dialog.css').find(rule=>rule.selector==='.dialog-actions>button');assert.equal(decls(actions)['max-width'],'100%');
 const clear=rules('app/search-field.css').filter(rule=>rule.selector==='.search-field .search-field-clear');assert(clear.some(rule=>rule.parent.type==='atrule'&&rule.parent.params.includes('pointer:coarse')&&decls(rule)['min-height']==='44px'));
});
test('legacy contract reader preserves values, declarations and media boundaries',()=>{
 const source='@media(max-width:760px){.legacy{display:flex}.legacy:not(:where([data-ui-button])){height:44px;color:red!important}.other:not([hidden]){color:blue}}';
 const parsed=postcss.parse(legacyButtonCss(source)),media=parsed.first;assert.equal(media.params,'(max-width:760px)');assert.equal(media.nodes.length,2);
 assert.equal(media.first.selector,'.legacy');assert.deepEqual(decls(media.first),{display:'flex',height:'44px',color:'red'});
 assert.equal(media.first.nodes.at(-1).important,true);assert.equal(media.last.selector,'.other:not([hidden])');
});
