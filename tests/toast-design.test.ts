import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {feedbackDuration} from '../app/feedback';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('confirmation toasts are quick visual notices with tone colours',()=>{
  for(const tone of ['success','error','warning'] as const){const value=feedbackDuration(tone);assert(value>=2000&&value<=3000,`${tone} dismisses inside 2-3 seconds`);}
  assert.equal(feedbackDuration('success'),2000);
  assert.equal(feedbackDuration('error'),3000);
  const center=read('app/notification-center.tsx');
  assert.match(center,/data-tone=\{item\.tone\}/);
  assert.doesNotMatch(center,/<button/,'the redesigned toast carries no controls');
  assert.match(center,/aria-live="polite"/);
  const css=read('app/toast.css');
  assert.match(css,/\.feedback-toast\{--toast-accent:var\(--success\)/,'success paints green');
  assert.match(css,/\[data-tone=error\]\{--toast-accent:var\(--danger\)/,'errors paint red');
  assert.match(css,/\[data-tone=warning\]\{--toast-accent:var\(--warning\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  const globals=read('app/globals.css');
  assert.doesNotMatch(globals,/\.toast\{/,'the legacy toast style is deleted');
  const fixes=read('app/qa-fixes.css');
  assert.doesNotMatch(fixes,/\.feedback-(toast|stack)/,'toast styling lives in a single file');
});

console.log('PASS: toast redesign — 2-3s auto-dismiss, tone colours and one shared visual style');
