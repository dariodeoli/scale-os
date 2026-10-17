import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const compile=contents=>build({stdin:{contents,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',metafile:true,minify:false,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});

test('pure validator subpath remains server-safe and does not pull React or renderers',async()=>{
 const result=await compile("export {numberInputProblem,numberInputValid,nativeNumberSettings} from 'owncoding-ui/number-utils';");
 const inputs=Object.keys(result.metafile.inputs);
 assert(inputs.some(file=>file.includes('owncoding-ui/dist/number-utils.js')));
 assert(!inputs.some(file=>/(?:^|\/)react(?:-dom)?\//.test(file)),inputs.join('\n'));
 assert(!inputs.some(file=>file.endsWith('/numeric.js')||file.endsWith('/index.js')),inputs.join('\n'));
 assert(!result.outputFiles[0].text.includes('use client'));
});

test('real Scale facades bundle the minimal numeric entry with one React package and no root renderer/CSS',async()=>{
 const result=await compile("import React from 'react';import{InputBase,TextareaBase}from'./app/ui/input';import{NumericControl,NumberInput,PercentageInput,numberInputValid}from'./app/ui/number';window.pilot={InputBase,TextareaBase,NumericControl,NumberInput,PercentageInput,numberInputValid,React};");
 const inputs=Object.keys(result.metafile.inputs);
 assert(inputs.some(file=>file.includes('owncoding-ui/dist/numeric.js')));
 assert(!inputs.some(file=>/owncoding-ui\/dist\/index\.js$/.test(file)),inputs.join('\n'));
 assert(!inputs.some(file=>file.endsWith('.css')||file.includes('lucide-react')||file.includes('react-dom')),inputs.join('\n'));
 const reactRoots=new Set(inputs.flatMap(file=>{const match=file.match(/^(.*\/node_modules\/react)\//)||file.match(/^(node_modules\/react)\//);return match?[match[1]]:[];}));
 assert.equal(reactRoots.size,1,'exactly one React package resolves in the consumer bundle');
});
