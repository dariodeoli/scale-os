"use client";
import {notify} from './feedback';
import {listDateFull,listDateShort} from './list-format';
import {count,hasMonthData,reportComparison,reportMoney,type ReportMonth,type ReportsData} from './reports-workspace';

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]!));}
function monthLabel(value:string){return escapeHtml(listDateShort(`${value}-01`)||value);}
function money(value:string|null|undefined,currency:string){return escapeHtml(reportMoney(value??null,currency));}
function monthDistance(from:string,to:string){const [fromYear,fromMonth]=from.split('-').map(Number),[toYear,toMonth]=to.split('-').map(Number);return fromYear*12+fromMonth-(toYear*12+toMonth);}
function comparisonMarkup(data:ReportsData,previousData:ReportsData|null,currency:string,months:number){
 const comparison=reportComparison(data,previousData,currency,months);
 const heading=`<h2>Comparativa del período visible contra el anterior · ${escapeHtml(currency)}</h2>`;
 if(!comparison.available)return `${heading}<p>Sin comparación: no hay período anterior con datos.</p>`;
 const windows=comparison.previousStart&&comparison.previousEnd?`${monthLabel(comparison.previousStart)} – ${monthLabel(comparison.previousEnd)}`:'sin período anterior disponible';
 return `${heading}<p class="note">Período visible: ${monthLabel(comparison.currentStart)} – ${monthLabel(comparison.currentEnd)} · período anterior: ${windows} (${months} meses por período).</p><table><thead><tr><th>Métrica</th><th>Período visible</th><th>Período anterior</th><th>Variación</th></tr></thead><tbody>${comparison.rows.map(row=>`<tr><th scope="row">${escapeHtml(row.label)}</th><td class="num">${escapeHtml(row.current)}</td><td class="num">${escapeHtml(row.previous)}</td><td>${escapeHtml(row.change)}</td></tr>`).join('')}</tbody></table>`;
}
function monthlyMarkup(months:ReportMonth[],currency:string){
 if(!months.length)return '<p>Sin meses registrados.</p>';
 const headers=['Mes','Activos','Incorporados','Bajas','Retención %','Facturado','Cobrado','Facturas','Ticket por factura'];
 return `<table><thead><tr>${headers.map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${months.map(row=>{const financial=row.financial.find(item=>item.currency===currency);return `<tr><th scope="row">${monthLabel(row.month)}${row.isPartial?' · parcial':''}</th><td class="num">${escapeHtml(count(row.clients.active))}</td><td class="num">${escapeHtml(count(row.clients.added))}</td><td class="num">${escapeHtml(count(row.clients.lost))}</td><td class="num">${escapeHtml(count(row.clients.retentionPercent))}</td><td class="num">${money(financial?.invoiced,currency)}</td><td class="num">${money(financial?.collected,currency)}</td><td class="num">${escapeHtml(count(financial?.invoiceCount))}</td><td class="num">${money(financial?.averageTicket,currency)}</td></tr>`;}).join('')}</tbody></table>`;
}
// Native browser print through an isolated popup; no third-party renderer.
export function printReportsPdf({data,previousData,currency,organizationName}:{data:ReportsData;previousData:ReportsData|null;currency:string;organizationName:string}){
 const popup=window.open('','_blank','width=900,height=700');
 if(!popup){notify({tone:'warning',message:'Permití ventanas emergentes para exportar el PDF.'});return;}
 const months=data.months.filter(hasMonthData).slice().sort((a,b)=>a.month.localeCompare(b.month));
 const span=previousData&&monthDistance(data.month,previousData.month)>0?monthDistance(data.month,previousData.month):Math.max(1,months.length);
 const period=`${months.length?monthLabel(months[0].month):monthLabel(data.month)} a ${monthLabel(data.month)}`;
 const generated=escapeHtml(listDateFull(new Date().toISOString())||'');
 popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informes${organizationName?` · ${escapeHtml(organizationName)}`:''}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Outfit,sans-serif;color:#151219;font-size:10pt}header{border-bottom:2px solid #151219;padding-bottom:1.5mm;margin-bottom:3mm}header p{margin:0 0 .6mm}header .org{font-weight:700;font-size:9pt;letter-spacing:.06em;text-transform:uppercase}h1{margin:0;font-size:19pt;letter-spacing:-.02em}h2{margin:5mm 0 1mm;font-size:12pt}p{margin:0;line-height:1.45}.note{font-size:8.5pt;color:#48424b;margin-bottom:1.5mm}table{width:100%;border-collapse:collapse;margin-bottom:2.5mm;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid #d8d4dc;padding:1.1mm 1.6mm;text-align:left;vertical-align:top}th{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#5d5762}td.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}th[scope=row]{font-weight:600}footer{margin-top:4mm;border-top:1px solid #d8d4dc;padding-top:1.5mm;font-size:8pt;color:#48424b}</style></head><body><header><p class="org">${escapeHtml(organizationName)}</p><h1>Informes</h1><p>Período: ${period}</p><p>Generado: ${generated} (hora de Asunción)</p></header><main>${comparisonMarkup(data,previousData,currency,span)}<h2>Detalle mensual · ${escapeHtml(currency)}</h2>${monthlyMarkup(months,currency)}</main><footer><p>Importes registrados, no utilidad ni rentabilidad. Las monedas se consultan por separado. “Sin datos” no significa cero.</p></footer><script>window.onload=()=>window.print()</script></body></html>`);
 popup.document.close();
}
