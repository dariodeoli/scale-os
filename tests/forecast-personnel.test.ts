import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const source=read('../app/financial-forecast.tsx');
assert(source.includes('members'),'personnel rows carry the members array');
assert(source.includes('salary-overrides'),'salary override endpoints are wired');
assert(source.includes('Sin salario fijo'),'zero-base members render the fallback badge');
assert(source.includes('formatSignedMoney'),'signed override amounts render with sign');
assert(source.includes('ActorAvatar'),'members render with ActorAvatar');
assert(source.includes('compensation_amount'),'salary editing updates the labor record amount');
assert(!source.includes('monthly_salary_currency'),'salary editing never sends the legacy monthly_salary_currency pair (API limited to PYG|USD)');
assert(source.includes('currency={salaryPerson.currency}'),'the salary amount is drawn in the record currency');

// #88: el panel se llama «Salarios» y el avatar se dimensiona por CSS, sin
// wrapper que recorte la foto (mobile y escritorio; iniciales incluidas).
assert.match(source,/>Salarios</,'the personnel panel is named Salarios');
assert.match(source,/aria-label="Salarios"/,'both personnel lists announce Salarios');
assert.doesNotMatch(source,/Personal proyectado/,'the old panel name is gone');
assert.doesNotMatch(source,/overflow-hidden[^>]{0,80}><ActorAvatar/,'no wrapper clips the personnel avatar');
assert.equal((source.match(/<ActorAvatar name=\{member\.name\} photo=\{safePhoto\(member\.photo_url\)\}\/>/g)||[]).length,2,'mobile card and desktop row render the avatar directly');
const globals=read('../app/globals.css');
assert.match(globals,/\.forecast-personnel-card \.actor-identity-avatar\{width:32px;height:32px;flex-basis:32px;font-size:11px\}/,'desktop sizes the avatar by CSS');
assert.match(globals,/@media\(max-width:540px\)\{\.forecast-personnel-card \.actor-identity-avatar\{width:34px;height:34px;flex-basis:34px/,'mobile sizes the avatar by CSS');
assert.match(globals,/\.forecast-personnel-card \.actor-identity-avatar/,'the initials fallback uses the same sized circle');
console.log('PASS: per-person personnel breakdown with avatars, signed monthly adjustments, salary editing, «Salarios» naming and CSS-sized avatars (#88)');
