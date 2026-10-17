import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {act, create} from 'react-test-renderer';
import type {Field} from '../app/operations';
Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const dialogId = require.resolve('../app/dialog');
require.cache[dialogId] = {id: dialogId, filename: dialogId, loaded: true, exports: {
 Dialog: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
 FormActions: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
 useDialogClose: () => undefined, useDialogPending: () => {},
}} as NodeModule;
const {Editor} = require('../app/operations') as typeof import('../app/operations');

// Read the actual field declarations, rather than maintaining a second schema in this test.
// Only the selected self-contained metadata object is evaluated; no workspace/network effects run.
function declaration(path: string, key: string): Field {
 const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let found: ts.ObjectLiteralExpression | undefined;
 const visit = (node: ts.Node) => {
  if (ts.isObjectLiteralExpression(node) && node.properties.some(property => ts.isPropertyAssignment(property) && property.name.getText(source) === 'key' && ts.isStringLiteral(property.initializer) && property.initializer.text === key)) found ??= node;
  ts.forEachChild(node, visit);
 };
 if (path === 'app/suite.tsx') {
  const settings = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'SettingsWorkspace');
  assert.ok(settings); visit(settings);
 } else visit(source);
 assert.ok(found, `${path} declares ${key}`);
 const javascript = ts.transpileModule(`const field = (${found.getText(source)});`, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
 return Function(`${javascript}; return field;`)() as Field;
}
async function boundary(path: string, key: string, max: number, minimum = false) {
 const field = declaration(path, key);
 assert.equal(field.maxLength, max, `${path}:${key} matches its API limit`);
 const saved: Record<string, string>[] = [];
 const editor = create(<Editor fields={[field]} defaults={{[key]: 'A'.repeat(max)}} save={async values => {saved.push(values);}}/>);
 await act(async () => {});
 assert.equal(editor.root.findByType('input').props.maxLength, max, 'native input carries the same boundary');
 const submit = () => editor.root.findByType('form').props.onSubmit({preventDefault() {}, persist() {}});
 await act(async () => {await submit();});
 assert.equal(saved.length, 1, 'the exact API boundary is accepted');
 assert.equal(saved[0][key].length, max);
 const change = async (value: string) => act(async () => {await editor.root.findByType('input').props.onChange({target: {name: key, value}, type: 'change'});});
 await change('A'.repeat(max + 1));
 await act(async () => {await submit();});
 assert.equal(saved.length, 1, 'oversized programmatic/paste values cannot bypass the schema');
 assert.equal(editor.root.findByType('input').props['aria-invalid'], true);
 if (minimum) {
  await change('A'); await act(async () => {await submit();});
  assert.equal(saved.length, 1, 'one-character personal names match the API rejection');
  await change('  '); await act(async () => {await submit();});
  assert.equal(saved.length, 1);
  await change('Al'); await act(async () => {await submit();});
  assert.equal(saved.length, 2, 'a two-character personal name is accepted');
 }
 await act(async () => editor.unmount());
}
async function main() {
 await boundary('app/suite.tsx', 'name', 160);
 for (const key of ['city', 'department', 'legal_representative_name', 'legal_representative_role']) await boundary('app/company-legal-profile.tsx', key, 160);
 await boundary('app/company-legal-profile.tsx', 'legal_representative_document', 60);
 await boundary('app/my-profile.tsx', 'full_name', 120, true);
 await boundary('app/team-person-sheet.tsx', 'full_name', 120, true);
 console.log('PASS: actual company/legal/person field metadata has matching native and real Editor schema boundaries');
}
void main();
