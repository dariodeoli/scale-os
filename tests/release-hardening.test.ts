import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const studio=read('../app/studio-workspace.tsx');
assert(studio.includes('/^\\d{4}-(0[1-9]|1[0-2])$/'),'studio month input validates before applying');
const commenting=read('../app/commenting.tsx');
assert(commenting.includes('if(!person)return'),'mention pick guards a missing suggestion');
const login=read('../app/api/auth/login/route.ts');
assert(login.includes('LOGIN_MAX_ATTEMPTS'),'login route rate limits attempts');
assert(login.includes('429'),'login route returns 429 when rate limited');
assert(!login.includes('max(128)'),'login route drops the password length cap');
const projects=read('../app/api/projects/route.ts');
const workOrders=read('../app/api/work-orders/route.ts');
for(const [name,source] of [['projects',projects],['work-orders',workOrders]] as const){assert(/p\.protocol\s*===\s*'https:'\s*&&\s*!p\.username\s*&&\s*!p\.password/.test(source),`${name} URLs refine to https-only`);}
console.log('PASS: month guard, mention guard, login rate limiting, https-only URL refinement');
