// Internal fixture extension. All records belong to a newly created private demo;
// no live identities, provider requests, credentials or real documents are used.
import {BUILTIN_CONTRACT_MODELS} from './contract-models.js';
import {contractMissing,renderContractText} from './contracts.js';
const marker='DEMO-MODULES-V1:complete';
const note='Ejemplo ficticio de la demo privada. Sin efectos contractuales, fiscales ni operaciones externas.';
const material='https://sistema.scaleparaguay.com/demo-materiales/brief.txt';
const one=async(c,sql,args)=>(await c.query(sql,args)).rows[0];

async function taskExamples(c,org,user,projects,people){
 const examples=[
  ['Preparar reunión de equipo','Revisar las entregas de hoy y acordar responsables.','in_progress','high',0],
  ['Aprobar guion de Aurora Café','Abrí la tarea y marcá una subtarea para probar el guardado privado.','pending','urgent',0],
  ['Confirmar set y equipos de la grabación','Revisar estudio, participantes y reserva de inventario.','pending','normal',0],
  ['Reprogramar edición pendiente','Tarea de ayer para probar el filtro de vencidas.','pending','high',-1],
  ['Preparar calendario de la próxima semana','Ejemplo de tarea próxima vinculada al proyecto.','pending','normal',2],
  ['Entregar primer corte de prueba','Ejemplo completado con su checklist.','done','normal',-1],
  ['Revisar referencias creativas','Tarea sin fecha para planificar durante la demo.','pending','low',null],
 ];
 for(const [index,[title,description,status,priority,offset]] of examples.entries()){
  const project=projects[index%projects.length],checklist=['Leer el brief','Confirmar materiales','Validar entrega'].map((text,i)=>({id:`demo-${index}-${i}`,text,completed:status==='done'||status==='in_progress'&&i===0}));
  const values=[org,title,description,status,priority,offset,project.id,project.client_id,user,JSON.stringify(checklist),JSON.stringify([{label:'Brief ficticio · archivo de ejemplo',url:material}])];
  let task;
  if(index===0)task=await one(c,`update agency_internal_tasks set title=$2,description=$3,status=$4,priority=$5,due_date=current_date+$6::int,due_time=null,project_id=$7,client_id=$8,assigned_user_id=$9,created_by_user_id=$9,updated_by_user_id=$9,checklist=$10::jsonb,materials=$11::jsonb,source_key='${marker}' where organization_id=$1 and title='Preparar reunión de equipo' returning id`,values);
  else task=await one(c,`insert into agency_internal_tasks(organization_id,title,description,status,priority,due_date,project_id,client_id,assigned_user_id,created_by_user_id,updated_by_user_id,checklist,materials,completed_at) values($1,$2,$3,$4,$5,current_date+$6::int,$7,$8,$9,$9,$9,$10::jsonb,$11::jsonb,case when $4='done' then now() else null end) returning id`,values);
  if(!task)throw Error('Falta la tarea inicial de la demo');
  for(const assigned of index===0?[user,people[1].user_id]:[user])await c.query('insert into agency_internal_task_assignees(organization_id,task_id,user_id) values($1,$2,$3)',[org,task.id,assigned]);
  if(index===1)await c.query('insert into agency_internal_task_comments(organization_id,task_id,author_user_id,body) values($1,$2,$3,$4)',[org,task.id,people[4].user_id,'El guion de ejemplo está listo. Podés editarlo y completar el checklist sin afectar otra demo.']);
 }
}

async function studioExamples(c,org,user,projects,people){
 const spaces=[];
 for(const [name,scenario] of [['Estudio principal','Set de video y fotografía'],['Sala podcast','Mesa de entrevistas con dos micrófonos']])spaces.push((await one(c,'insert into agency_studio_spaces(organization_id,name,scenario,notes,created_by_user_id) values($1,$2,$3,$4,$5) returning id',[org,name,scenario,note,user])).id);
 for(const [index,[day,start,end,production,title]] of [[0,'09:00','11:00','video','Grabación de campaña · hoy'],[0,'14:00','15:30','podcast','Entrevista de ejemplo · hoy'],[1,'10:00','12:00','fotografia','Sesión de productos · mañana']].entries()){
  const reservation=await one(c,"insert into agency_studio_reservations(organization_id,space_id,project_id,title,production_type,starts_at,ends_at,notes,created_by_user_id) values($1,$2,$3,$4,$5,(current_date+$6::int+$7::time) at time zone 'America/Asuncion',(current_date+$6::int+$8::time) at time zone 'America/Asuncion',$9,$10) returning id",[org,spaces[index%2],projects[index].id,title,production,day,start,end,note,user]);
  for(const member of [user,people[4].user_id])await c.query('insert into agency_studio_reservation_members(organization_id,reservation_id,user_id) values($1,$2,$3)',[org,reservation.id,member]);
 }
}

async function legalExamples(c,org,user,projects,calendar){
 await c.query("insert into agency_company_legal_profiles(organization_id,city,department,legal_representative_name,legal_representative_document,legal_representative_role,provenance,updated_by) values($1,'Asunción','Capital','Sebastián Benítez · personaje ficticio','DEMO-REP-001','Representante de ejemplo',$2::jsonb,$3)",[org,JSON.stringify(Object.fromEntries(['city','department','legal_representative_name','legal_representative_document','legal_representative_role'].map(key=>[key,{source:'fictional-demo'}]))),user]);
 const clients=(await c.query('select c.id,c.name,c.tax_id,i.currency,i.total::text as total from agency_clients c join agency_invoices i on i.organization_id=c.organization_id and i.client_id=c.id where c.organization_id=$1 order by c.id',[org])).rows;
 for(const [index,client] of clients.entries())await c.query("update agency_clients set legal_name=name||' · empresa ficticia',address=$3,city=$4,department='Central',document_type='ruc',document_number=tax_id,party_type='company',legal_representative_name=$5,legal_representative_document=$6,legal_representative_role='Representante de ejemplo' where organization_id=$1 and id=$2",[org,client.id,`Calle Ejemplo ${index+1} · dirección ficticia`,index%2?'Luque':'San Lorenzo',`Representante ficticio ${index+1}`,`DEMO-CI-${String(index+1).padStart(3,'0')}`]);
 for(const [index,model] of BUILTIN_CONTRACT_MODELS.entries()){
  const body='EJEMPLO FICTICIO · SIN EFECTOS CONTRACTUALES NI FISCALES\n\n'+model.body,template=await one(c,'insert into agency_contract_templates(organization_id,name,agreement_type,body,required_fields,created_by) values($1,$2,$3,$4,$5::jsonb,$6) returning id',[org,model.name,model.agreement_type,body,JSON.stringify(model.required_fields),user]);
  const client=clients[index],variables={
   'company.legal_name':'Agencia Horizonte E.A.S.','company.tax_id':'80000000-0','company.address':'Av. Ejemplo 120 · dirección ficticia','company.city':'Asunción','company.department':'Capital','company.legal_representative_name':'Sebastián Benítez · personaje ficticio','company.legal_representative_document':'DEMO-REP-001',
   'counterparty.legal_name':client.name+' · empresa ficticia','counterparty.document_type':'RUC','counterparty.document':client.tax_id,'counterparty.address':`Calle Ejemplo ${index+1} · dirección ficticia`,'counterparty.city':index%2?'Luque':'San Lorenzo','counterparty.department':'Central','counterparty.signer_name':`Representante ficticio ${index+1}`,'counterparty.signer_document':`DEMO-CI-${String(index+1).padStart(3,'0')}`,
   'agreement.signing_city':'Asunción','agreement.signed_on':calendar.today,'agreement.starts_on':calendar.today,'agreement.ends_on':calendar.next_month,
   'agreement.scope':'Estrategia y producción audiovisual para una campaña ficticia.','agreement.deliverables':'4 reels de hasta 30 segundos y 8 piezas gráficas de ejemplo.','agreement.exclusions':'No incluye pauta publicitaria, traslados ni archivos fuente.','agreement.currency':client.currency,'agreement.amount':client.total,'agreement.tax_terms':'IVA incluido en el importe ilustrativo. No es un comprobante fiscal.','agreement.payment_terms':'Ejemplo: 50% al inicio y 50% a la entrega. No se ejecutan cobros reales.',
   'agreement.delivery_terms':'Calendario ilustrativo de entregas semanales acordado entre las partes.','agreement.renewal_terms':'Un mes de ejemplo; cualquier renovación requiere acuerdo expreso.','agreement.corrections_terms':'Una ronda de correcciones de ejemplo por pieza.','agreement.client_obligations':'Entregar materiales de referencia y revisar los borradores de ejemplo.','agreement.cancellation_terms':'Comunicar cambios con cinco días de anticipación; condiciones ilustrativas y editables.','agreement.portfolio_terms':'Sólo se muestran contenidos ficticios dentro de esta demo privada.','agreement.jurisdiction':'Texto ilustrativo sujeto a revisión; sin efectos legales.','agreement.notes':note,
  },sources=Object.fromEntries(Object.keys(variables).map(key=>[key,{source:'fictional-demo'}]));
  if(contractMissing(body,variables,model.required_fields).length)throw Error('Faltan campos del contrato de demo');
  const title=`Ejemplo ficticio · ${model.name}`,contract=await one(c,'insert into agency_contracts(organization_id,template_id,title,body,required_fields,variables,sources,client_id,created_by) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9) returning id',[org,template.id,title,body,JSON.stringify(model.required_fields),JSON.stringify(variables),JSON.stringify(sources),client.id,user]);
  if(index===0)await c.query('insert into agency_contract_versions(organization_id,contract_id,version,title,body,rendered_text,variables,sources,template_id,template_revision,contains_bank_data,reviewed_by) values($1,$2,1,$3,$4,$5,$6::jsonb,$7::jsonb,$8,1,false,$9)',[org,contract.id,title,body,renderContractText(body,variables),JSON.stringify(variables),JSON.stringify(sources),template.id,user]);
  await c.query("insert into agency_contract_audit(organization_id,actor_user_id,entity_type,entity_id,action,revision) values($1,$2,'contract',$3,'demo-fixture',1)",[org,user,String(contract.id)]);
 }
}

async function financeExamples(c,org,user,projects,people,calendar){
 const accounts=(await c.query("select id from bank_accounts where organization_id=$1 and currency='PYG' order by id",[org])).rows;
 const payment=await one(c,"insert into agency_payments(organization_id,account_id,amount,received_on,reference,received_by_user_id,request_key) values($1,$2,450000,current_date,'DEMO · anticipo libre ficticio',$3,$4) returning id",[org,accounts[0].id,user,'DEMO-MODULES-V1:receipt']);
 await c.query('insert into agency_payment_links(organization_id,payment_id,client_id,project_id,updated_by) values($1,$2,$3,$4,$5)',[org,payment.id,projects[0].client_id,projects[0].id,user]);
 const debt=await one(c,"insert into agency_opening_receivables(organization_id,client_id,amount,currency,period,due_on,expected_on,reason,forecast_included,request_key,created_by) values($1,$2,800000,'PYG',date_trunc('month',current_date-interval '1 month')::date,current_date-12,current_date+5,$3,true,$4,$5) returning id",[org,projects[0].client_id,'DEMO · saldo anterior ficticio; no corresponde a una factura real','DEMO-MODULES-V1:receivable',user]);
 await c.query('insert into agency_payment_applications(organization_id,payment_id,receivable_id,amount,created_by) values($1,$2,$3,200000,$4)',[org,payment.id,debt.id,user]);
 for(const [category,kind,amount] of [['Herramientas','fixed',180000],['Traslados de producción','variable',75000]])await c.query("insert into agency_expenses(organization_id,account_id,category,kind,amount,currency,paid_on,reference,created_by_user_id,request_key) values($1,$2,$3,$4,$5,'PYG',current_date,$6,$7,$8)",[org,accounts[0].id,category,kind,amount,'DEMO · gasto ilustrativo sin pago externo',user,'DEMO-MODULES-V1:expense:'+category]);
}

async function inventoryExamples(c,org,user,people){
 const rows=(await c.query("select id,storage_shelf,value from agency_inventory where organization_id=$1 and name<>'Trípode de estudio' order by id",[org])).rows;
 for(const [index,item] of rows.entries()){
  let location=null;
  if(item.storage_shelf){location=(await one(c,'insert into agency_inventory_storage_locations(organization_id,name,responsible_user_id) values($1,$2,$3) on conflict(organization_id,lower(trim(name))) do update set responsible_user_id=excluded.responsible_user_id returning id',[org,item.storage_shelf,people[4].user_id])).id;}
  await c.query("update agency_inventory set serial_number=$3,ownership_kind=$4,owner_user_id=$5,storage_location_id=$6,purchase_value=value,purchase_date=current_date-90,depreciation_method='linear',useful_life_months=36,residual_value=0,notes=notes||E'\\n'||$7 where organization_id=$1 and id=$2",[org,item.id,`DEMO-INV-${String(index+1).padStart(3,'0')}`,index===3?'person':'company',index===3?people[4].user_id:null,location,note]);
  await c.query("insert into agency_inventory_trace(organization_id,inventory_id,event_type,actor_user_id,context) values($1,$2,'ownership.changed',$3,$4::jsonb)",[org,item.id,user,JSON.stringify({demo:true,ownership_kind:index===3?'person':'company'})]);
 }
 await c.query("insert into agency_inventory_maintenance(organization_id,inventory_id,maintenance_date,kind,description,cost,currency,responsible_user_id,created_by_user_id) values($1,$2,current_date-7,'Limpieza preventiva',$3,0,'PYG',$4,$5)",[org,rows[0].id,'Registro de mantenimiento ficticio para recorrer el historial.',people[4].user_id,user]);
}

export async function seedDemoModules(c,{organizationId:org,userId:user}){
 await c.query('savepoint demo_modules_v1');
 try{
  const organization=await one(c,'select id,slug,demo_owner_user_id,created_at=transaction_timestamp() as newly_created from organizations where id=$1 for update',[org]);
  if(!organization||String(organization.demo_owner_user_id)!==String(user)||!organization.slug.startsWith('demo-session-'))throw Object.assign(Error('Sólo se amplía la demo privada propia'),{status:403});
  if((await c.query('select 1 from agency_internal_tasks where organization_id=$1 and source_key=$2',[org,marker])).rows.length){await c.query('release savepoint demo_modules_v1');return {seeded:false};}
  if(!organization.newly_created)throw Object.assign(Error('Los ejemplos sólo se crean al iniciar una nueva demo'),{status:409});
  const projects=(await c.query('select id,client_id from agency_projects where organization_id=$1 order by id',[org])).rows,people=(await c.query('select id,user_id from agency_collaborators where organization_id=$1 and user_id<>$2 order by id',[org,user])).rows;
  if(projects.length!==20||people.length!==8)throw Error('Falta la base sintética de proyectos y personas');
  const calendar=await one(c,"select current_date::text as today,(current_date+interval '1 month')::date::text as next_month");
  await taskExamples(c,org,user,projects,people);
  await studioExamples(c,org,user,projects,people);
  await legalExamples(c,org,user,projects,calendar);
  await financeExamples(c,org,user,projects,people,calendar);
  await inventoryExamples(c,org,user,people);
  await c.query('release savepoint demo_modules_v1');return {seeded:true};
 }catch(error){await c.query('rollback to savepoint demo_modules_v1');await c.query('release savepoint demo_modules_v1');throw error;}
}
