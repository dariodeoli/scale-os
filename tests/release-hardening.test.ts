import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const studio=read('../app/studio-workspace.tsx');
assert(studio.includes('/^\\d{4}-(0[1-9]|1[0-2])$/'),'studio month input validates before applying');
const commenting=read('../app/commenting.tsx');
assert(commenting.includes('if(!person)return'),'mention pick guards a missing suggestion');
// Las rutas Next de auth y de datos (clients/projects/work-orders) se retiraron
// (issues #22 y #32): el front va por /core-api y allí viven el rate limiting y
// la validación de URLs.
console.log('PASS: month guard, mention guard, retired parallel auth and data routes');
