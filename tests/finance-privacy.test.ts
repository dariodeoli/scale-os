import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAPABILITY_ROLES} from '../app/capabilities';
import {FINANCE_PRIVACY_NOTICE_PATH,FINANCE_PURPOSES,financeNoticeHref,financePurpose,financePurposeNotice} from '../app/finance-privacy';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 1. Inventario de finalidades: cada dato personal de FIN declara para qué se
//    trata, base legal, quién lo ve y dónde se captura.
const ids=FINANCE_PURPOSES.map(purpose=>purpose.id);
assert.deepEqual([...ids].sort(),['billing','commissions','payments','payroll','reports','treasury'],'the finance inventory covers payroll, payments, commissions, billing, reports and treasury');
assert.equal(new Set(ids).size,ids.length,'purpose ids are unique');
for(const purpose of FINANCE_PURPOSES){
 assert(purpose.data.length>0,`${purpose.id} declares the personal data it treats`);
 assert(purpose.capturePoints.length>0,`${purpose.id} declares where the data is captured`);
 assert(purpose.legalBasis.length>0,`${purpose.id} declares its legal basis`);
 assert(purpose.subjects.every(subject=>['collaborator','client','other'].includes(subject)),`${purpose.id} declares valid data subjects`);
 for(const capability of purpose.visibility)assert(capability in CAPABILITY_ROLES,`${purpose.id} maps to a real capability (${capability})`);
}
// El dato más sensible queda atado a la capacidad más fina.
assert.deepEqual(financePurpose('payroll').visibility,['salary.view'],'payroll is gated by salary.view');
assert.deepEqual(financePurpose('commissions').visibility,['commissions.manage'],'commission data is gated by commissions.manage');
assert.deepEqual(financePurpose('treasury').visibility,['accounts.manage'],'bank account data is gated by accounts.manage');
assert.throws(()=>financePurpose('nope' as never),/Finalidad financiera desconocida/);

// 2. Transparencia: un solo enlace canónico al aviso, con ancla por finalidad.
assert.equal(FINANCE_PRIVACY_NOTICE_PATH,'/privacidad','the public notice route is a single canonical constant');
assert.equal(financeNoticeHref(),'/privacidad');
assert.equal(financeNoticeHref('billing'),'/privacidad#billing');
assert.equal(financePurposeNotice('payroll'),'Finalidad: Previsión y pago de remuneraciones');

// 3. Paridad con el contrato del API: la retención y la anonimización ejecutable
//    viven en backend/finance-privacy.js con los mismos ids de finalidad.
const backend=read('backend/finance-privacy.js');
const backendPurposes=[...backend.matchAll(/purpose:'([a-z]+)'/g)].map(match=>match[1]);
assert.deepEqual([...new Set(backendPurposes)].sort(),[...ids].sort(),'front and API share the same purpose ids');
for(const table of ['agency_invoices','agency_payments','agency_payouts','agency_commissions','agency_expenses','agency_statement_lines','account_transfers'])
 assert(backend.includes(`{dataset:'${table}'`),`${table} is covered by the retention contract`);
assert(!backend.includes("onExpiry:'delete'"),'retention never schedules a destructive purge');
assert(/export async function financePersonalData/.test(backend),'the API exposes the ARSOP finance export used by #112');
assert(/export async function anonymizeFinanceSubject/.test(backend),'the API exposes subject anonymization for #112');
assert(/export async function anonymizeExpiredFinanceData/.test(backend),'the API exposes the age-based sweep for #112');

// 4. Todo punto de captura de datos personales de FIN muestra la finalidad y
//    enlaza el aviso; nada de capturas silenciosas.
const capturePoints:[string,RegExp,number][]=[
 ['app/financial-forecast.tsx',/financeNoticeHref\('payroll'\)/g,2],
 ['app/financial-forecast.tsx',/financePurposeNotice\('payroll'\)/g,2],
 ['app/sections/comisiones.tsx',/financeNoticeHref\('commissions'\)/g,2],
 ['app/sections/comisiones.tsx',/financeNoticeHref\('payments'\)/g,1],
 ['app/workspace-forms.tsx',/financeNoticeHref\('treasury'\)/g,1],
 ['app/workspace-forms.tsx',/financeNoticeHref\('payments'\)/g,1],
];
for(const [file,pattern,expected] of capturePoints){
 const matches=read(file).match(pattern)||[];
 assert.equal(matches.length,expected,`${file} states ${pattern.source} ${expected} time(s)`);
}
for(const file of ['app/financial-forecast.tsx','app/sections/comisiones.tsx','app/workspace-forms.tsx'])assert(read(file).includes('Aviso de Privacidad'),`${file} names the privacy notice`);

console.log('PASS finance privacy: purpose inventory, API retention parity and capture-point notices');
