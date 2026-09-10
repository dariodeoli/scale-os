type Opportunity={stage?:unknown;amount?:unknown;currency?:unknown;notes?:unknown};
export function pipelineSummary(rows:Opportunity[]){
 const open=rows.filter(r=>!['won','lost'].includes(String(r.stage)));
 const amounts:Record<string,number>={};
 for(const row of open){const currency=String(row.currency||'PYG'),amount=Number(row.amount);if(Number.isFinite(amount))amounts[currency]=(amounts[currency]||0)+amount;}
 return{open:open.length,won:rows.filter(r=>r.stage==='won').length,web:rows.filter(r=>String(r.notes||'').startsWith('Origen: landing Scale OS.')).length,amounts};
}
