import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {founderPricingNote} from '../app/founder-pricing';
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const landing=read('public/scale-os.html');
assert(landing.includes(`<p class="price-note" data-founder-pricing><strong>Sumate como cliente fundador.</strong> ${founderPricingNote}</p>`));
assert(landing.includes(`<summary>¿El precio puede subir? ¿Qué beneficio tiene un cliente fundador?</summary><p>${founderPricingNote}</p>`));
assert(founderPricingNote.includes('puede cambiar en el futuro'));
assert(founderPricingNote.includes('siempre una tarifa preferencial frente a los nuevos clientes'));
assert(founderPricingNote.includes('aunque el importe inicial se actualice'));
for(const file of ['app/subscription-panel.tsx','app/registro/page.tsx','app/workspace-guide.tsx']){
 const source=read(file);assert(source.includes('import {founderPricingNote}'));assert(source.includes('{founderPricingNote}'));
}
assert(read('app/registro/page.tsx').includes('aria-describedby="trial-conditions founder-conditions"'));
assert(landing.includes('US$10/mes o G.50.000/mes por agencia'));
assert(landing.includes('Sin cobro por usuario'));
console.log('PASS: consistent launch/founder copy in pricing, FAQ, signup and subscription; no frozen-price promise or per-user billing change');
