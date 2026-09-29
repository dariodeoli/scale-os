/*
 * Volumen de producción para las mediciones de carga (#108): siembra la demo
 * local con el orden de magnitud de una agencia real (clientes, proyectos,
 * piezas, auditoría, inventario) sin tocar datos existentes. Idempotente: cada
 * bloque se salta si ya hay suficiente volumen.
 *
 * Uso (con el Postgres del stack de QA corriendo):
 *   PG_BIN=/opt/homebrew/opt/postgresql@17/bin PG_PORT=55477 ORG=<id> \
 *   node build-tools/visual-harness/seed-volume-plt.mjs
 */
import {execFileSync} from 'node:child_process';

const PG_BIN=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@17/bin';
const PG_PORT=process.env.PG_PORT||'55477';
const psql=sql=>execFileSync(`${PG_BIN}/psql`,['-h','127.0.0.1','-p',PG_PORT,'-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();
const count=sql=>Number(psql(sql)||0);

const org=process.env.ORG||psql("select id from organizations where slug like 'demo-session-%' order by id desc limit 1");
const user=psql(`select user_id from organization_members where organization_id=${org} and active order by user_id limit 1`);

const plan=[
 ['clientes', 300, `select count(*) from agency_clients where organization_id=${org}`, `insert into agency_clients(organization_id,name,email,phone,lifecycle_status)
   select ${org},'Cliente '||n,'cliente'||n||'@volumen.example','+595 9'||lpad((n%100000000)::text,8,'0'),
   (array['active','active','active','paused','active'])[1+(n%5)] from generate_series(1,300) n
   where not exists(select 1 from agency_clients c where c.organization_id=${org} and c.email='cliente'||n||'@volumen.example')`],
 ['proyectos', 60, `select count(*) from agency_projects where organization_id=${org}`, `insert into agency_projects(organization_id,client_id,name,status,approval_levels)
   select ${org},c.id,'Proyecto '||n,(array['active','active','active','paused'])[1+(n%4)],1+(n%3)
   from generate_series(1,60) n join lateral (select id from agency_clients where organization_id=${org} order by id offset (n%greatest(1,(select count(*) from agency_clients where organization_id=${org})::int)) limit 1) c on true
   where not exists(select 1 from agency_projects p where p.organization_id=${org} and p.name='Proyecto '||n)`],
 ['piezas', 1500, `select count(*) from agency_work_orders where organization_id=${org}`, `insert into agency_work_orders(organization_id,project_id,title,status,due_date,work_type,assigned_user_id)
   select ${org},p.id,'Pieza '||n,(array['to_record','recorded','editing','review','approved'])[1+(n%5)],
   current_date+((n%45)-20),(array['video','reedicion','foto','produccion','entregable'])[1+(n%5)],${user}
   from generate_series(1,1500) n join lateral (select id from agency_projects where organization_id=${org} order by id offset (n%greatest(1,(select count(*) from agency_projects where organization_id=${org})::int)) limit 1) p on true
   where not exists(select 1 from agency_work_orders w where w.organization_id=${org} and w.title='Pieza '||n)`],
 ['auditoría', 4000, `select count(*) from agency_operation_audit where organization_id=${org}`, `insert into agency_operation_audit(organization_id,table_name,action,actor,after_state,before_state,created_at)
   select ${org},'agency_work_orders','UPDATE',${user}::text,jsonb_build_object('id',n,'status','approved','title','Pieza auditada '||n),jsonb_build_object('status','review'),now()-((n%60)||' days')::interval
   from generate_series(1,4000) n
   where not exists(select 1 from agency_operation_audit a where a.organization_id=${org} and a.after_state->>'title'='Pieza auditada '||n)`],
 ['inventario', 400, `select count(*) from agency_inventory where organization_id=${org}`, `insert into agency_inventory(organization_id,name,serial_number,status,category,value,currency)
   select ${org},'Equipo '||n,'VOL-'||lpad(n::text,6,'0'),(array['available','available','in_use','maintenance'])[1+(n%4)],'Categoría '||(n%8),350000+(n%50)*10000,'PYG'
   from generate_series(1,400) n
   where not exists(select 1 from agency_inventory i where i.organization_id=${org} and i.serial_number='VOL-'||lpad(n::text,6,'0'))`],
 ['avisos', 400, `select count(*) from agency_notifications where organization_id=${org}`, `insert into agency_notifications(organization_id,user_id,kind,title,body,dedupe_key,read_at,resolved_at)
   select ${org},${user},'due','Entrega pendiente: Pieza '||n,'La pieza vence hoy o está atrasada.','volumen:'||n,
   case when n%3=0 then now() else null end, case when n%4=0 then now() else null end from generate_series(1,400) n
   where not exists(select 1 from agency_notifications x where x.organization_id=${org} and x.dedupe_key='volumen:'||n)`],
];

for(const [label,target,current,insert] of plan){
 const before=Number(psql(current)||0);
 if(before>=target){console.log(`${label}: ${before} (ya alcanza ${target})`);continue;}
 psql(insert);
 const after=Number(psql(current)||0);
 console.log(`${label}: ${before} → ${after}`);
}
// Analiza las tablas para que los planes usen estadísticas reales.
psql('analyze agency_clients; analyze agency_projects; analyze agency_work_orders; analyze agency_operation_audit; analyze agency_inventory; analyze agency_notifications;');
console.log(JSON.stringify({org,user,listo:true}));
