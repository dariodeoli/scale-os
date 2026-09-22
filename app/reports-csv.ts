import type {ReportsData} from './reports-data';

const quote=(value:string)=>`"${value.replace(/"/g,'""')}"`;
// Quoting alone does not stop spreadsheet formulas. Text fields never opt into numbers.
function text(value:string|null){
 const raw=value??'';
 return quote(/^[\t\r\n]|^\s*[=+@-]/.test(raw)?"'"+raw:raw);
}
// Preserve decimal strings byte-for-byte, including negative values and trailing zeros.
// Only this strict numeric grammar bypasses text formula protection.
function numeric(value:string|number|null|undefined){
 const raw=value==null?'':String(value);
 return quote(/^-?\d+(?:\.\d+)?$/.test(raw)?raw:'');
}

/** The visible historical table, one selected currency; no totals or conversions. */
export function reportsCsv(data:ReportsData,currency:string){
 const header=['Mes','Mes parcial','Moneda','Activos','Incorporados','Bajas de actividad','Retención %','Antigüedad (días)','Fechas conocidas','Facturado con impuestos','Cobrado neto','Facturas','Clientes facturados','Ticket por factura','Promedio por cliente facturado','Datos al (ISO 8601)','Histórico confiable desde (ISO 8601)'];
 const rows=data.months.slice().sort((a,b)=>a.month.localeCompare(b.month)).map(row=>{
  const money=row.financial.find(item=>item.currency===currency);
  return [text(row.month),text(row.isPartial?'Sí':'No'),text(currency),
   ...[row.clients.active,row.clients.added,row.clients.lost,row.clients.retentionPercent,row.clients.averageTenureDays,row.clients.tenureKnown,
    money?.invoiced,money?.collected,money?.invoiceCount,money?.billedClients,money?.averageTicket,money?.averageRevenuePerClient].map(numeric),
   text(data.asOf),text(data.historySince)].join(';');
 });
 return '\uFEFF'+[header.map(text).join(';'),...rows].join('\r\n')+'\r\n';
}

export function downloadReportsCsv(data:ReportsData,currency:string){
 const blob=new Blob([reportsCsv(data,currency)],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');
 try{
  anchor.href=url;
  const month=/^\d{4}-\d{2}$/.test(data.month)?data.month:'periodo';
  const code=/^[A-Z]{3}$/.test(currency)?currency:'sin-moneda';
  anchor.download=`scale-os-informes-${month}-${code}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
 }finally{
  anchor.remove();
  // Give the browser time to begin reading the download before freeing the URL.
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
