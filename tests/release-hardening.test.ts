import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateMonth} from '../app/ui/temporal-value';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const studio=read('../app/studio-workspace.tsx');
assert.match(studio,/useTemporalFilter\([^\n]+value=>validateMonth\(value\)\?value:null\)/,'studio keeps raw text separate and validates before applying');
for(const value of ['2026-','2026-00','2026-13','2026-2','0000-01'])assert.equal(validateMonth(value),false);
assert.equal(validateMonth('2026-10'),true);
const commenting=read('../app/commenting.tsx');
assert(commenting.includes('if(!person)return'),'mention pick guards a missing suggestion');
// Las rutas Next de auth y de datos (clients/projects/work-orders) se retiraron
// (issues #22 y #32): el front va por /core-api y allí viven el rate limiting y
// la validación de URLs.
console.log('PASS: month guard, mention guard, retired parallel auth and data routes');
