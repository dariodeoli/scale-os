import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyzeActions,runMigration} from '../build-tools/migrate-ui-actions.mjs';
const analyze=(source,options={})=>analyzeActions(source,{file:'app/sections/example.tsx',...options});

test('native action keeps omitted type, refs, form, events, data, SSR and child anatomy',()=>{
 const source=`'use client';\n// keep module comment\nexport function F(){return <button className="primary" ref={ref} form="save" name="action" value="publish" data-id={id} onClick={go}><svg/><div>{content}</div>{/* keep child */}</button>;}`;
 const r=analyze(source);assert.equal(r.sites[0].status,'migrate');assert.equal(r.sites[0].type,'omitted');
 assert.match(r.source,/ref=\{ref\} form="save" name="action" value="publish" data-id=\{id\} onClick=\{go\}/);
 assert.match(r.source,/<svg\/><div>\{content\}<\/div>\{\/\* keep child \*\/\}/);
 assert(!r.source.includes('type='));assert(r.source.startsWith("'use client';"));assert.match(r.source,/keep module comment/);
 const ssr=analyze('export function Server(){return <button type="submit" className="secondary">Guardar</button>}');
 assert(!ssr.source.includes('use client'));assert.match(ssr.source,/type="submit"/);
});

test('icon action uses existing ReactNode and accessible label once, never guesses a glyph',()=>{
 const r=analyze('import {Pencil as Edit} from "lucide-react"; const F=()=> <button className="text-button" aria-label={record.label} type="button"><Edit size={16}/></button>');
 assert.equal(r.sites[0].status,'migrate');assert.match(r.source,/label=\{record.label\}/);
 assert(r.source.includes('icon={<><Edit size={16}/></>}'));assert.equal((r.source.match(/record.label/g)||[]).length,1);
 assert.equal(analyze('<button className="primary" aria-label="Cerrar">×</button>').source.includes('IconButton'),false);
 assert.equal(analyze('import {X} from "lucide-react"; <button className="secondary"><X/></button>').sites[0].status,'manual');
});

test('widget internals, role, state and only canonical renderer are explicit exemptions',()=>{
 for(const source of ['<button className="primary" role="tab">Tab</button>','<button className="primary" aria-haspopup="menu">Menú</button>','function PlainSelect(){return <button className="primary">Elegir</button>}']){
  const r=analyze(source);assert.equal(r.source,source);assert.equal(r.sites[0].status,'structural');assert(r.sites[0].reason);
 }
 assert.equal(analyze('<button/>',{file:'app/ui/button.tsx'}).sites[0].status,'renderer');
 assert.equal(analyze('<button/>',{file:'app/another/button.tsx'}).sites[0].status,'manual');
});

test('dynamic classes and spreads remain untouched unless safe fallback is explicit',()=>{
 const source='<button className={active?"primary":"secondary"} type={kind}>Abrir</button>';
 assert.equal(analyze(source).source,source);
 const r=analyze(source,{fallbackVariant:'ghost'});assert.match(r.source,/className=\{active\?"primary":"secondary"\}/);assert.match(r.source,/type=\{kind\}/);assert.match(r.source,/variant="ghost"/);
 const spread='<button {...props} className="primary">Abrir</button>';assert.equal(analyze(spread,{fallbackVariant:'primary'}).source,spread);
 assert.throws(()=>analyze(source,{fallbackVariant:'unknown'}));
});

test('mixed and aliased Button imports retain other imports and every comment',()=>{
 const source='import { Other, /* before */ Button /* between */ as Existing, /* after */ Last } from "owncoding-ui";\nconst F=()=> <Existing type="reset" form="f" ref={ref}>Texto</Existing>';
 const r=analyze(source);assert.match(r.source,/Button as Existing\} from "\.\.\/ui\/button"/);assert.match(r.source,/<Existing type="reset" form="f" ref=\{ref\}>Texto/);
 for(const text of ['Other','Last','/* before */','/* between */','/* after */'])assert(r.source.includes(text));
 const pure=analyze('import {Button as B} from "owncoding-ui"; <B/>');assert.match(pure.source,/from "\.\.\/ui\/button"/);
 const icons=analyze('import {IconAction} from "owncoding-ui";<IconAction icon="trash" label="Borrar"/>');assert.equal(icons.changed,false);assert.equal(icons.sites[0].status,'manual');
});

test('generated identifiers avoid collisions and second run is idempotent',()=>{
 const source='const ScaleButton=1; export const F=()=> <button className="primary">Guardar</button>';
 const first=analyze(source);assert.match(first.source,/Button as ScaleButton2/);
 assert.equal(analyze(first.source).source,first.source);
});

test('audit never writes app; write is explicit and produces complete hash report',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'scale-ui-action-test-'));fs.mkdirSync(path.join(root,'app'));
 const file=path.join(root,'app','page.tsx'),source='<button className="primary">Guardar</button>';fs.writeFileSync(file,source);
 try{
  const audit=runMigration({root,report:'audit.json'});assert.equal(audit.mode,'audit');assert.equal(fs.readFileSync(file,'utf8'),source);assert.equal(audit.sites.length,1);assert.equal(audit.files[0].sha256.length,64);
  assert.throws(()=>runMigration({root,write:true}));assert.throws(()=>runMigration({root,report:'app/page.tsx'}));assert.throws(()=>runMigration({root,files:['../outside.tsx']}));
  const write=runMigration({root,write:true,files:['app/page.tsx']});assert.equal(write.mode,'write');assert.notEqual(fs.readFileSync(file,'utf8'),source);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('all source comments survive, conflicting variants wait, and invalid input fails closed',()=>{
 const source='import {Button as B, /* retain */ Other} from "owncoding-ui"; /* top */ const F=()=> <button /* attr */ className="primary">{/* body */}Guardar</button>;';
 const r=analyze(source);for(const c of ['/* retain */','/* top */','/* attr */','/* body */'])assert(r.source.includes(c));
 assert.equal(analyze('<button className="primary secondary">Guardar</button>').sites[0].status,'manual');
 assert.throws(()=>analyze('<button>'));
});

test('audit report cannot overwrite unrelated JSON and parse failure writes nothing',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'scale-ui-action-fail-'));fs.mkdirSync(path.join(root,'app'));
 const valid='<button className="primary">Guardar</button>';fs.writeFileSync(path.join(root,'app/a.tsx'),valid);fs.writeFileSync(path.join(root,'app/b.tsx'),'<button>');fs.writeFileSync(path.join(root,'package.json'),'{}');
 try{
  assert.throws(()=>runMigration({root,write:true,files:['app/a.tsx','app/b.tsx']}));assert.equal(fs.readFileSync(path.join(root,'app/a.tsx'),'utf8'),valid);
  assert.throws(()=>runMigration({root,files:['app/a.tsx'],report:'package.json'}));assert.equal(fs.readFileSync(path.join(root,'package.json'),'utf8'),'{}');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('namespace actions are reported rather than silently rewritten; canonical sites remain accounted',()=>{
 const source='import * as UI from "owncoding-ui";<UI.Button>Guardar</UI.Button>';
 const r=analyze(source);assert.equal(r.source,source);assert.equal(r.sites[0].status,'manual');
 const local=analyze('import {Button as B} from "../ui/button";<B>Guardar</B>');assert.equal(local.sites[0].status,'canonical');assert.equal(local.changed,false);
});

test('CLI refuses contradictory audit/write modes before opening source files',()=>{
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('../build-tools/migrate-ui-actions.mjs',import.meta.url)),'--write','--dry-run','app/missing.tsx'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/cannot be combined/);
});
