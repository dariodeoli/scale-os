import assert from 'node:assert/strict';
import {test} from 'node:test';
import ts from 'typescript';
import {migrateFieldSource} from '../build-tools/migrate-ui-fields.mjs';

test('field migration preserves directives, refs, callbacks, dynamic types and textarea contents',()=>{
 const source=`'use client';\nimport {Input as FilterInput,Textarea,MoneyInput,Card} from 'owncoding-ui';\nconst view=<form><input type={field.type} ref={field.ref} {...field.props} onChange={update}/><textarea defaultValue="Draft">Text</textarea><FilterInput type="date" onChange={onDate}/><Textarea value={notes}/><MoneyInput currency={currency} value={amount} symbol="$" onValueChange={setAmount}/></form>;`;
 const result=migrateFieldSource(source,'app/sections/example.tsx');
 assert(result.source.startsWith(`'use client';`));
 assert.match(result.source,/InputControl as FilterInput/);assert.match(result.source,/from '\.\.\/ui\/input-control'/);
 assert.match(result.source,/<InputControl type=\{field.type\} ref=\{field.ref\} \{\.\.\.field.props\} onChange=\{update\}/);
 assert.match(result.source,/<TextareaBase defaultValue="Draft">Text<\/TextareaBase>/);
 assert.match(result.source,/<MoneyInput currency=\{currency\} value=\{amount\}\s+onChange=\{setAmount\}/);
 assert.doesNotMatch(result.source,/onValueChange|symbol="\$"/);
 assert.equal(ts.createSourceFile('fixture.tsx',result.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length,0);
 assert.equal(migrateFieldSource(result.source,'app/sections/example.tsx').source,result.source,'idempotent');
});
