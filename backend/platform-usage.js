import {actor,platformPersonPhoto,platformOrganizationLogo} from './platform-admin.js';
import {realUser,realOrganization} from './platform-demo-filter.js';
import {ZONE,shift,iso,local,indexed,rawRange,periodFromQuery} from './platform-period.js';

// Panel de uso de plataforma (#191). Solo lectura, solo administradores globales.
// Datos mínimos: sesiones de presencia, altas y la identidad pública (nombre, foto,
// correo). Nunca montos, salarios ni campos financieros.
const num=value=>Number(value||0);
const identity=alias=>`coalesce(nullif(trim(pi.full_name),''),nullif(trim(${alias}.google_full_name),''),split_part(${alias}.email,'@',1))`;
const photo=platformPersonPhoto;
const RANGE='$1::date',RANGE_END='$2::date+1';

// Sesiones de organizaciones y usuarios reales (sin demos), con el día/hora local de Asunción.
const events=(bound='')=>`select s.user_id,s.organization_id,s.first_seen_at,s.last_seen_at,${local('s.first_seen_at')} as local_at
  from agency_usage_sessions s join organizations o on o.id=s.organization_id join users u on u.id=s.user_id
  where ${realOrganization('o')} and ${realUser('u')} ${bound}`;
const inPeriod=events(rawRange('s.first_seen_at',RANGE,RANGE_END));

export async function platformUsageData(db,{from,to}){
 const days=Math.round((to-from)/86400000)+1,prevFrom=shift(from,-days);
 const f=iso(from),t=iso(to),p=iso(prevFrom),pt=iso(shift(from,-1));
 const inRange='local_at>=$1::date and local_at<$2::date+1';
 const sessionsInRange=`${local('s.first_seen_at')}>=$1::date and ${local('s.first_seen_at')}<$2::date+1`;
 const [daily,prevDaily,signups,hourly,totals,monthly,agencies,users,recurringDaily,source]=await Promise.all([
  db.query(`with ev as (${inPeriod}) select g.d::date::text as day,count(distinct ev.user_id)::int as users,count(ev.user_id)::int as sessions
    from generate_series($1::date,$2::date,'1 day') g(d) left join ev on ev.local_at::date=g.d::date group by g.d order by g.d`,[f,t]),
  db.query(`with ev as (${inPeriod}) select g.d::date::text as day,count(distinct ev.user_id)::int as users,count(ev.user_id)::int as sessions
    from generate_series($1::date,$2::date,'1 day') g(d) left join ev on ev.local_at::date=g.d::date group by g.d order by g.d`,[p,pt]),
  db.query(`select g.d::date::text as day,
    (select count(*)::int from users u where ${realUser('u')} and ${local('u.created_at')}::date=g.d::date ${rawRange('u.created_at','g.d::date','g.d::date+1')}) as users,
    (select count(*)::int from organizations o where ${realOrganization('o')} and ${local('o.created_at')}::date=g.d::date ${rawRange('o.created_at','g.d::date','g.d::date+1')}) as agencies
    from generate_series($1::date,$2::date,'1 day') g(d) order by g.d`,[f,t]),
  db.query(`with ev as (${inPeriod}) select h::int as hour,count(distinct ev.user_id)::int as users
    from generate_series(0,23) h left join ev on extract(hour from ev.local_at)=h and ev.${inRange.replace(' and ',' and ev.')} group by h order by h`,[f,t]),
  db.query(`with ev as (${events(rawRange('s.first_seen_at','$3::date',RANGE_END))}),cur as (select * from ev where ${inRange}),
    rec as (select user_id from cur group by user_id having count(distinct local_at::date)>=2)
    select (select count(distinct user_id)::int from cur) as unique_users,
      (select count(*)::int from rec) as recurring_users,
      (select count(*)::int from cur) as sessions,
      (select count(distinct user_id)::int from ev where local_at>=$3::date and local_at<$1::date) as previous_unique_users,
      (select count(*)::int from ev where local_at>=$3::date and local_at<$1::date) as previous_sessions,
      (select count(*)::int from (select user_id from ev where local_at>=$3::date and local_at<$1::date group by user_id having count(distinct local_at::date)>=2) pr) as previous_recurring_users,
      (select count(distinct live.user_id)::int from (${events(indexed("s.last_seen_at>now()-interval '5 minutes'"))}) live where live.last_seen_at>now()-interval '5 minutes') as active_now`,[f,t,p]),
  db.query(`with m as (select date_trunc('month',(now() at time zone '${ZONE}'))-(n||' month')::interval as start from generate_series(0,3) n),
    ev as (${events(indexed(`s.first_seen_at>=((date_trunc('month',(now() at time zone '${ZONE}'))-interval '3 month') at time zone '${ZONE}')-interval '1 day'`))})
    select to_char(m.start,'YYYY-MM') as month,
      (select count(*)::int from users u where ${realUser('u')} and ${local('u.created_at')}>=m.start and ${local('u.created_at')}<m.start+interval '1 month'
        ${indexed(`u.created_at>=(m.start at time zone '${ZONE}')-interval '1 day' and u.created_at<((m.start+interval '1 month') at time zone '${ZONE}')+interval '1 day'`)}) as signups,
      (select count(distinct ev.user_id)::int from ev where ev.local_at>=m.start and ev.local_at<m.start+interval '1 month') as active_users
    from m order by m.start`),
  db.query(`select o.id,o.name,${platformOrganizationLogo('o')} as logo_url,
     (select count(distinct s.user_id)::int from agency_usage_sessions s join users u on u.id=s.user_id where s.organization_id=o.id and ${realUser('u')} and s.last_seen_at>now()-interval '7 days') as active7,
     (select count(distinct s.user_id)::int from agency_usage_sessions s join users u on u.id=s.user_id where s.organization_id=o.id and ${realUser('u')} and s.last_seen_at>now()-interval '30 days') as active30,
     (select count(*)::int from agency_usage_sessions s join users u on u.id=s.user_id where s.organization_id=o.id and ${realUser('u')} and ${sessionsInRange} ${rawRange('s.first_seen_at',RANGE,RANGE_END)}) as sessions,
     (select max(s.last_seen_at) from agency_usage_sessions s join users u on u.id=s.user_id where s.organization_id=o.id and ${realUser('u')}) as last_seen_at,
     ow.id as owner_id,${identity('ow')} as owner_name,${photo('ow')} as owner_avatar,ow.email as owner_email
    from organizations o
    left join lateral (select m.user_id from organization_members m where m.organization_id=o.id and m.role='owner' and m.active and m.removed_at is null order by m.user_id limit 1) own on true
    left join users ow on ow.id=own.user_id and ${realUser('ow')}
    left join user_personal_identities pi on pi.user_id=ow.id
    where ${realOrganization('o')}
    order by active30 desc,last_seen_at desc nulls last,o.id limit 200`,[f,t]),
  db.query(`with last as (
      select distinct on(s.user_id) s.user_id,s.organization_id,s.last_seen_at from agency_usage_sessions s
      join organizations o on o.id=s.organization_id where ${realOrganization('o')}
      order by s.user_id,s.last_seen_at desc)
    select u.id,${identity('u')} as name,${photo('u')} as avatar_url,u.email,o.name as agency,l.last_seen_at,
      (select count(*)::int from agency_usage_sessions s join organizations so on so.id=s.organization_id where s.user_id=u.id and ${realOrganization('so')} and ${sessionsInRange} ${rawRange('s.first_seen_at',RANGE,RANGE_END)}) as sessions
    from last l join users u on u.id=l.user_id join organizations o on o.id=l.organization_id
    left join user_personal_identities pi on pi.user_id=u.id
    where ${realUser('u')} order by l.last_seen_at desc,u.id limit 50`,[f,t]),
  // Recurrentes por día: quienes entraron ese día y ya habían entrado otro día del período.
  db.query(`with ev as (${inPeriod}),ud as (select distinct user_id,local_at::date as day from ev where ${inRange})
    select g.d::date::text as day,count(ud.user_id) filter(where exists(select 1 from ud prior where prior.user_id=ud.user_id and prior.day<ud.day))::int as recurring
    from generate_series($1::date,$2::date,'1 day') g(d) left join ud on ud.day=g.d::date group by g.d order by g.d`,[f,t]),
  // Sondeo de fuente (un exists que corta en la primera fila): sin rango por diseño.
  db.query(`/*fuente:has_data*/ select exists(select 1 from agency_usage_sessions s join organizations o on o.id=s.organization_id join users u on u.id=s.user_id where ${realOrganization('o')} and ${realUser('u')}) as sessions,
    exists(select 1 from users u where ${realUser('u')}) as users`)
 ]);
 const total=totals.rows[0];
 return {
  range:{from:f,to:t,days,previous_from:p,previous_to:pt,timezone:ZONE},
  totals:{unique_users:num(total.unique_users),recurring_users:num(total.recurring_users),sessions:num(total.sessions),previous_unique_users:num(total.previous_unique_users),
   previous_sessions:num(total.previous_sessions),previous_recurring_users:num(total.previous_recurring_users),active_now:num(total.active_now)},
  daily:daily.rows.map((row,index)=>({day:row.day,users:row.users,sessions:row.sessions,recurring:recurringDaily.rows[index]?.recurring??0,
   previous_day:prevDaily.rows[index]?.day||null,previous_users:prevDaily.rows[index]?.users??0,previous_sessions:prevDaily.rows[index]?.sessions??0})),
  // La fuente existe pero no hay filas reales todavía: el panel dice «Sin datos todavía».
  has_data:{sessions:source.rows[0]?.sessions===true,users:source.rows[0]?.users===true},
  signups:signups.rows,
  hourly:hourly.rows,
  monthly:monthly.rows,
  agencies:agencies.rows.map(row=>({id:row.id,name:row.name,logo_url:row.logo_url||null,active7:row.active7,active30:row.active30,sessions:row.sessions,last_seen_at:row.last_seen_at,
   owner:row.owner_id?{name:row.owner_name,avatar_url:row.owner_avatar||null,email:row.owner_email}:null})),
  users:users.rows
 };
}

export async function platformUsage({req,res,url,db,session,send}){
 if(url.pathname!=='/api/platform/usage')return false;
 try{
  await actor(db,session,req);
  if(req.method!=='GET'){send(res,405,{error:'Método no permitido'});return true;}
  const {from,to}=periodFromQuery(url.searchParams);
  send(res,200,await platformUsageData(db,{from,to}));
  return true;
 }catch(error){
  if(error.status){send(res,error.status,{error:error.message});return true;}
  throw error;
 }
}
