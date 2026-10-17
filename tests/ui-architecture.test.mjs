import assert from 'node:assert/strict';
import test from 'node:test';
import {auditUiArchitecture} from '../build-tools/check-ui-architecture.mjs';
const audit=sources=>auditUiArchitecture(new Map(Object.entries(sources)));
const codes=sources=>audit(sources).map(item=>item.code);

test('canonical renderer facades preserve aliases while utility and type imports remain available',()=>{
 assert.deepEqual(audit({
  'app/ui/surface.tsx':"export {Card as CardSurface} from 'owncoding-ui'",
  'app/ui/collection.tsx':"export {DataTable} from 'owncoding-ui'",
  'app/ui/notice.tsx':"export {Aviso as Notice, Nota as Note} from 'owncoding-ui'",
  'app/ui/navigation.tsx':"export {SegmentedField, Subtabs} from 'owncoding-ui'",
  'app/ui/amount.tsx':"import {MoneyInput} from 'owncoding-ui'; export {MoneyInput}",
  'app/ui/choice.tsx':"export {Checkbox, Switch} from 'owncoding-ui'",
  'app/ui-v2.tsx':"import {EmptyState, ErrorState, Badge} from 'owncoding-ui'",
  'app/comment.ts':"// import {Input} from 'owncoding-ui'\n const text = \"fetch('/api')\";",
  'app/client.tsx':"import {parseTelefono} from 'owncoding-ui'; import {diasHasta} from 'owncoding-ui/utils'; import type {ButtonProps} from 'owncoding-ui';",
  'app/scale-ui.ts':"export {Editor} from './operations'; export type {Field as EditorField} from './operations'",
 }),[]);
});
test('renamed imports and reexports cannot bypass canonical primitive ownership',()=>{
 assert.deepEqual(codes({'app/customer.tsx':"import {Input as Local, type InputProps} from 'owncoding-ui'"}),['external-primitive']);
 assert.deepEqual(codes({'app/customer.tsx':"export {Button as FineName} from 'owncoding-ui'"}),['external-primitive']);
 assert.deepEqual(codes({'app/ui/surface.tsx':"export {Card, Input} from 'owncoding-ui'"}),['external-primitive'],'facade permission is per symbol, not per file');
});
test('opaque namespace/default/dynamic/require imports cannot hide UI bypasses',()=>{
 for(const source of ["import * as ui from 'owncoding-ui'","import ui from 'owncoding-ui'","export * from 'owncoding-ui'","const ui=await import('owncoding-ui')","const ui=require('owncoding-ui')","import ui = require('owncoding-ui')"]){
  assert.ok(codes({'app/customer.tsx':source}).includes('opaque-owncoding-import'),source);
 }
});
test('implementations cannot depend on public barrel paths, aliases, types or reexports',()=>{
 for(const source of ["import {InputBase} from './index'","import {InputBase} from '@/app/ui'","export {InputBase} from './index'","import type {InputBaseProps} from '@/app/ui/index'"]){
  const found=codes({'app/ui/index.ts':"export const InputBase=1",'app/ui/input.tsx':source});
  assert.ok(found.includes('implementation-barrel'),source);
 }
});
test('pure bases reject explicit business modules, API bindings and network calls',()=>{
 for(const source of ["import {api as send} from '../operations'","import {contractRequest} from '../contracts-data'","import client from 'axios'","fetch('/api/agency/clients')","window.fetch('/api')","globalThis['fetch']('/api')","navigator.sendBeacon('/api','data')","new XMLHttpRequest()","new WebSocket('wss://example.invalid')"]){
  assert.ok(codes({'app/ui/button.tsx':source}).some(code=>code.startsWith('business-')),source);
 }
 assert.ok(codes({'app/ui-v2.tsx':"import {money} from './operations'"}).includes('business-module'));
 assert.deepEqual(codes({'app/ui/button.tsx':"export function Button({onClick}) {return <button onClick={onClick}/>;}"}),[],'consumer callbacks are not I/O');
});
test('pure UI rejects the domain bridge while Scale entry remains selective',()=>{
 assert.ok(codes({'app/ui/index.ts':"export {Editor} from '../operations'"}).includes('public-business-export'));
 assert.ok(codes({'app/ui/index.ts':"export type {Field} from '../operations'"}).includes('public-business-export'));
 assert.ok(codes({'app/scale-ui.ts':"export {api as request} from './operations'"}).includes('public-business-export'));
 assert.deepEqual(codes({'app/scale-ui.ts':"export {Editor} from './operations'; export type {Field as EditorField} from './operations'"}),[]);
 assert.ok(codes({'app/ui/index.ts':"export {api as request} from '../operations'"}).includes('public-business-export'));
 assert.ok(codes({'app/ui/index.ts':"export * from '../operations'"}).includes('public-wildcard'));
 assert.ok(codes({'app/ui/index.ts':"export {contractRequest} from '../contracts-data'"}).includes('public-business-export'));
});
test('UI dependency SCCs find indirect and self cycles without rejecting old business-only graphs',()=>{
 assert.ok(codes({'app/ui/a.ts':"import './b'",'app/ui/b.ts':"import './c'",'app/ui/c.ts':"import './a'"}).includes('ui-cycle'));
 assert.ok(codes({'app/ui/a.ts':"import './a'"}).includes('ui-cycle'));
 assert.deepEqual(codes({'app/a.ts':"import './b'",'app/b.ts':"import './a'"}),[]);
 assert.deepEqual(codes({'app/ui/a.ts':"import type {B} from './b'",'app/ui/b.ts':"import './a'"}),[],'type-only edges cannot create runtime cycles');
 assert.deepEqual(codes({'app/ui/a.ts':"import {type B} from './b'",'app/ui/b.ts':"import './a'"}),[],'specifier-level type imports cannot create runtime cycles');
});
