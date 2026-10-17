import {roleCan} from './permissions.js';
import {assertRecordAvailable} from './record-lifecycle.js';
import {fail,id} from './suite-validation.js';

const parse=value=>typeof value==='string'?JSON.parse(value):value;
const listing=value=>(parse(value)||[]).map(item=>typeof item==='string'?item:`${item.quantity ?? 1} × ${item.description ?? ''}`).join('\n');
const date=value=>value instanceof Date?value.toISOString().slice(0,10):String(value??'').slice(0,10);

// Commercial amounts remain decimal strings. PostgreSQL does the arithmetic;
// no binary floating point or integer rounding enters a legal snapshot.
export async function fillContractCommercial(c,u,b,put){
 if(b.budget_id&&b.plan_id)fail('Elegí un presupuesto o un plan');
 if(!b.budget_id&&!b.plan_id)return;
 if(!roleCan(u,'budgets.manage'))fail('Sin permiso para presupuestos y planes',403);
 if(b.collaborator_id)fail('Un presupuesto o plan requiere una contraparte cliente');
 const table=b.budget_id?'agency_budgets':'agency_plans',key=id(b.budget_id||b.plan_id);
 const row=(await c.query(`select * from ${table} where id=$1 and organization_id=$2 for update`,[key,u.organization_id])).rows[0];
 if(!row)fail('Origen comercial no encontrado',404);
 await assertRecordAvailable(c,table,row);
 if(row.active===false)fail('El plan está inactivo',409);
 if(b.budget_id){
  if(!b.client_id||String(row.client_id)!==String(id(b.client_id)))fail('El presupuesto debe corresponder al cliente seleccionado',409);
  if(['rejected','expired'].includes(row.status))fail('El presupuesto está rechazado o vencido',409);
  const putBudget=(key,value)=>put('agreement.'+key,value,'budget',row.id);
  putBudget('title',row.title);putBudget('scope',row.title);putBudget('amount',row.total);putBudget('currency',row.currency);putBudget('notes',row.notes);
  const items=(await c.query('select description,quantity from agency_budget_items where budget_id=$1 order by position',[row.id])).rows;
  putBudget('deliverables',listing(items));
  putBudget('tax_terms',`IVA ${String(Number(row.tax_rate)*100)}%; total del presupuesto con impuestos incluidos.`);
  // valid_until is quotation validity, never the service's end date.
  return;
 }
 const putPlan=(key,value)=>put('agreement.'+key,value,'plan',row.id);
 putPlan('plan_name',row.name);putPlan('scope',row.name);putPlan('currency',row.currency);putPlan('notes',row.notes);putPlan('deliverables',listing(row.items));
 const amount=(await c.query(`select coalesce(sum(round((item->>'quantity')::numeric*coalesce(item->>'unitPrice',item->>'unit_price')::numeric,2)),0)::text as amount from jsonb_array_elements($1::jsonb) item`,[JSON.stringify(parse(row.items)||[])])).rows[0].amount;
 putPlan('amount',amount);
 // The selected client's negotiated terms are more sensitive than catalog
 // prices. Respect their independent permission and match the actual plan ID.
 if(!b.client_id||!roleCan(u,'commercial-terms.manage'))return;
 const term=(await c.query(`select *,case when monthly_price is not null then round(case discount_type when 'percent' then monthly_price*(1-discount_value/100) when 'fixed' then greatest(monthly_price-discount_value,0) else monthly_price end,2)::text else recurring_amount::text end as contract_amount from agency_client_commercial_terms where organization_id=$1 and client_id=$2 and plan_id=$3 and effective_until is null and coalesce(starts_on,effective_from)<=current_date and (ends_on is null or ends_on>=current_date) order by coalesce(effective_from,starts_on) desc,id desc limit 1`,[u.organization_id,id(b.client_id),row.id])).rows[0];
 if(!term)return;
 const putTerm=(key,value)=>put('agreement.'+key,value,'client-commercial-terms',term.id);
 putTerm('amount',term.contract_amount);putTerm('currency',term.currency);putTerm('plan_name',term.plan_name||row.name);
 if(parse(term.deliverables)?.length)putTerm('deliverables',listing(term.deliverables));
 putTerm('starts_on',date(term.starts_on||term.effective_from));if(term.ends_on)putTerm('ends_on',date(term.ends_on));
 const cadence={monthly:'Cobro mensual',once:'Pago único',interval:`Cobro cada ${term.interval_months} meses`}[term.cadence];
 if(cadence)putTerm('payment_terms',[cadence,term.discount_terms].filter(Boolean).join('. '));
}
