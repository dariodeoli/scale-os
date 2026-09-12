import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

test('body-level toast close targets keep 44px outside the workspace container',()=>{
 const css=readFileSync(new URL('../app/qa-fixes.css',import.meta.url),'utf8');
 const rule=css.match(/\.feedback-toast button\{([^}]+)\}/)?.[1];
 assert(rule);
 for(const property of ['width','height','min-width','min-height'])assert(rule.includes(`${property}:44px`));
});
