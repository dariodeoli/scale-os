import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currencyCodes,currencyChoices,validCurrency} from '../app/currencies';
import {normalizeAmount,displayAmount} from '../app/amount-format';
import {sectionPath,parentSection} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
assert.equal(currencyChoices.length,6);assert.equal(validCurrency('XXX'),'PYG');
for(const code of currencyCodes.filter(c=>c!=='PYG')){assert.equal(normalizeAmount('1.250,50',code),'1250.50');assert.equal(displayAmount('1250.50',code),'1.250,50');}
assert.equal(normalizeAmount('1.250', 'PYG'),'1250');
assert.equal(sectionPath('Producción'),'/produccion');assert.equal(sectionPath('Invitaciones'),'/equipo/invitaciones');assert.equal(parentSection('Métricas'),'Pipeline');
for(const role of ['management','finance','sales','production','editor','viewer'])assert(!visibleModule('Invitaciones',role));
const ui=readFileSync('app/scale-workspace.tsx','utf8');assert(ui.includes('productionView==="Tablero"'));assert(ui.includes('<DragOverlay>'));assert(ui.includes('onDragCancel'));assert(ui.includes('initialView={productionView}'));
const pending=readFileSync('app/acceso-pendiente/page.tsx','utf8');assert(pending.includes('/api/invitations/status'));assert(!pending.includes('/api/agency/'));assert(pending.includes('clearInterval(timer)'));
const landing=readFileSync('public/scale-os.html','utf8');assert(landing.includes('/core-api/api/public/contact'));assert(landing.includes('button.disabled=true'));assert(landing.includes('consent'));assert(landing.includes('https://sistema.scaleparaguay.com/demo'));
console.log('PASS: international amount entry, grouped permissions, production view/drag overlay, restricted waiting screen and landing form');
