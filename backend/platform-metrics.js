import {actor} from './platform-admin.js';
import {realUser,realOrganization} from './platform-demo-filter.js';
import {localDay,rawRange,periodFromQuery} from './platform-period.js';

// Métricas del Resumen del panel global (guía §3). Solo lectura, solo admins globales.
// Cada indicador trae el valor del período, el del período anterior de IGUAL duración
// y la serie diaria (días de Asunción) para la sparkline. Las demos nunca entran en
// el panel (viven solo en «Tráfico y demos», otra sección). Si la fuente todavía no tiene filas reales,
// `has_data` es false y el panel muestra «Sin datos todavía» en vez de un cero.
// Parámetros de las series: $1 = inicio del período anterior, $2 = fin del período actual.
const WINDOW='$1::date',END='$2::date';
const num=value=>Number(value||0);

// Altas reales por día en la ventana [anterior … actual].
const agenciesDaily=`with g as (select d::date as day from generate_series(${WINDOW},${END},'1 day') d),
  x as (select ${localDay('o.created_at')} as day from organizations o
   where ${realOrganization('o')} and ${localDay('o.created_at')} between ${WINDOW} and ${END} ${rawRange('o.created_at',WINDOW,`${END}+1`)})
  select g.day::text as day,count(x.day)::int as value
  from g left join x on x.day=g.day group by g.day order by g.day`;
const usersDaily=`with g as (select d::date as day from generate_series(${WINDOW},${END},'1 day') d),
  x as (select ${localDay('u.created_at')} as day from users u
   where ${realUser('u')} and ${localDay('u.created_at')} between ${WINDOW} and ${END} ${rawRange('u.created_at',WINDOW,`${END}+1`)})
  select g.day::text as day,count(x.day)::int as value
  from g left join x on x.day=g.day group by g.day order by g.day`;

// Sesiones y usuarios activos por día (presencia real, #191).
const sessionsDaily=`with g as (select d::date as day from generate_series(${WINDOW},${END},'1 day') d),
  x as (select s.user_id,${localDay('s.first_seen_at')} as day
   from agency_usage_sessions s join organizations o on o.id=s.organization_id join users u on u.id=s.user_id
   where ${realOrganization('o')} and ${realUser('u')} and ${localDay('s.first_seen_at')} between ${WINDOW} and ${END} ${rawRange('s.first_seen_at',WINDOW,`${END}+1`)})
  select g.day::text as day,count(x.day)::int as sessions,count(distinct x.user_id)::int as active_users
  from g left join x on x.day=g.day group by g.day order by g.day`;

// Usuarios activos del período (distintos en todo el período, no la suma de días).
// $3 = inicio del período actual.
const activeTotals=`select count(distinct s.user_id) filter(where ${localDay('s.first_seen_at')}>=$3::date)::int as current,
   count(distinct s.user_id) filter(where ${localDay('s.first_seen_at')}<$3::date)::int as previous
  from agency_usage_sessions s join organizations o on o.id=s.organization_id join users u on u.id=s.user_id
  where ${realOrganization('o')} and ${realUser('u')} and ${localDay('s.first_seen_at')} between ${WINDOW} and ${END} ${rawRange('s.first_seen_at',WINDOW,`${END}+1`)}`;
// Cupones canjeados por agencias reales.
const redemptionsDaily=`with g as (select d::date as day from generate_series(${WINDOW},${END},'1 day') d),
  x as (select ${localDay('r.created_at')} as day
   from platform_coupon_redemptions r join organizations o on o.id=r.organization_id
   where ${realOrganization('o')} and ${localDay('r.created_at')} between ${WINDOW} and ${END} ${rawRange('r.created_at',WINDOW,`${END}+1`)})
  select g.day::text as day,count(x.day)::int as value
  from g left join x on x.day=g.day group by g.day order by g.day`;

// Consultas de la landing: formulario público, no tiene cuentas de demo.
const inquiriesDaily=`with g as (select d::date as day from generate_series(${WINDOW},${END},'1 day') d),
  x as (select ${localDay('i.created_at')} as day from platform_inquiries i
   where ${localDay('i.created_at')} between ${WINDOW} and ${END} ${rawRange('i.created_at',WINDOW,`${END}+1`)})
  select g.day::text as day,count(x.day)::int as value from g left join x on x.day=g.day group by g.day order by g.day`;

// ¿La fuente tiene alguna fila real? (exists: corta en la primera fila).
const sources=`/*fuente:has_data*/ select
  exists(select 1 from organizations o where ${realOrganization('o')}) as agencies,
  exists(select 1 from users u where ${realUser('u')}) as users,
  exists(select 1 from agency_usage_sessions s join organizations o on o.id=s.organization_id join users u on u.id=s.user_id where ${realOrganization('o')} and ${realUser('u')}) as sessions,
  exists(select 1 from platform_inquiries i) as inquiries,
  exists(select 1 from platform_coupon_redemptions r join organizations o on o.id=r.organization_id where ${realOrganization('o')}) as redemptions`;

/** Separa la serie de la ventana en período anterior y actual (misma duración). */
function split(rows,from,key='value'){
 const current=rows.filter(row=>row.day>=from),previous=rows.filter(row=>row.day<from);
 const sum=list=>list.reduce((total,row)=>total+num(row[key]),0);
 return {value:sum(current),previous:sum(previous),series:current.map(row=>num(row[key]))};
}

export async function platformMetricsData(db,period){
 const values=[period.p,period.t];
 const [agencies,users,sessions,active,redemptions,inquiries,source]=await Promise.all([
  db.query(agenciesDaily,values),
  db.query(usersDaily,values),
  db.query(sessionsDaily,values),
  db.query(activeTotals,[period.p,period.t,period.f]),
  db.query(redemptionsDaily,values),
  db.query(inquiriesDaily,values),
  db.query(sources),
 ]);
 const has=source.rows[0]||{};
 const kpi=(rows,key,flag)=>({...split(rows,period.f,key),has_data:has[flag]===true});
 const activeKpi={...kpi(sessions.rows,'active_users','sessions'),value:num(active.rows[0]?.current),previous:num(active.rows[0]?.previous)};
 return {
  range:period.range,
  days:agencies.rows.filter(row=>row.day>=period.f).map(row=>row.day),
  kpis:{
   agencies:kpi(agencies.rows,'value','agencies'),
   users:kpi(users.rows,'value','users'),
   active_users:activeKpi,
   sessions:kpi(sessions.rows,'sessions','sessions'),
   inquiries:kpi(inquiries.rows,'value','inquiries'),
   redemptions:kpi(redemptions.rows,'value','redemptions'),
  },
 };
}

export async function platformMetrics({req,res,url,db,session,send}){
 if(url.pathname!=='/api/platform/metrics')return false;
 try{
  await actor(db,session,req);
  if(req.method!=='GET'){send(res,405,{error:'Método no permitido'});return true;}
  send(res,200,await platformMetricsData(db,periodFromQuery(url.searchParams)));
  return true;
 }catch(error){
  if(error.status){send(res,error.status,{error:error.message});return true;}
  throw error;
 }
}
