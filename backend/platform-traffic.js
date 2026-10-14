// Panel global «Tráfico y demos»: GET /api/platform/traffic?from=AAAA-MM-DD&to=AAAA-MM-DD.
// Solo administradores globales (mismo guard `actor` que /api/platform/*). Todo sale
// de la analítica de primera parte (public_page_views, public_analytics_events) en
// consultas agregadas y parametrizadas; días agrupados en America/Asuncion. La
// landing excluye la superficie demo y la demo se devuelve como bloque aparte.
import {actor} from './platform-admin.js';
import {analiticaSinDemo,analiticaSoloDemo,realUser} from './platform-demo-filter.js';
import {ANALYTICS_CTAS,ANALYTICS_ZONE,analyticsRange,asuncionDay} from './public-analytics-core.js';

export const TRAFFIC_PATH='/api/platform/traffic';
const Z=ANALYTICS_ZONE;
// Medianoche de Asunción como timestamptz: rango exacto y sargable sobre created_at (índices por fecha).
const midnight=day=>`((${day})::timestamp at time zone '${Z}')`;
const localDay=column=>`(${column} at time zone '${Z}')::date`;
const CUR_START=midnight('$1::date'),CUR_END=midnight('$2::date+1'),PREV_START=midnight('$3::date');
const between=(column,from,to)=>`${column}>=${from} and ${column}<${to}`;
const num=value=>value===null||value===undefined?null:Number(value);
const int=value=>Number(value||0);

// Vistas de la landing del período actual y del anterior (la fila sabe a cuál pertenece).
const landingViews=`select pv.*,pv.created_at>=${CUR_START} as current from public_page_views pv
 where ${analiticaSinDemo('pv')} and ${between('pv.created_at',PREV_START,CUR_END)}`;
const demoViews=`select pv.*,pv.created_at>=${CUR_START} as current from public_page_views pv
 where ${analiticaSoloDemo('pv')} and ${between('pv.created_at',PREV_START,CUR_END)}`;
const events=(only)=>`select e.*,e.created_at>=${CUR_START} as current from public_analytics_events e
 where ${only('e')} and ${between('e.created_at',PREV_START,CUR_END)}`;
const viewTotals=`count(*)::int as views,count(distinct visitor)::int as visitors,
 round(avg(seconds))::int as avg_seconds,count(seconds)::int as timed,
 round(avg(scroll_pct))::int as avg_scroll,count(scroll_pct)::int as scrolled,
 count(*) filter(where scroll_pct>=25)::int as s25,count(*) filter(where scroll_pct>=50)::int as s50,
 count(*) filter(where scroll_pct>=75)::int as s75,count(*) filter(where scroll_pct>=100)::int as s100,
 count(*) filter(where is_mobile)::int as mobile`;

const emptyTotals={views:0,visitors:0,avg_seconds:null,timed:0,avg_scroll:null,scrolled:0,s25:0,s50:0,s75:0,s100:0,mobile:0};
const totalsBy=(rows,current)=>{const row=rows.find(item=>item.current===current);if(!row)return {...emptyTotals};const {current:_,...rest}=row;return Object.fromEntries(Object.entries(rest).map(([key,value])=>[key,key==='avg_seconds'||key==='avg_scroll'?num(value):int(value)]));};
const countsBy=(rows,current)=>Object.fromEntries(rows.filter(row=>row.current===current).map(row=>[row.label,int(row.total)]));

export async function platformTrafficData(db,range){
 const base=[range.from,range.to,range.previous_from];
 const series=`generate_series($1::date,$2::date,interval '1 day') g(d)`;
 const [lTotals,lDaily,lToday,pages,referrers,ctas,ctaDaily,signups,dStarts,dDaily,roles,dTotals,dDuration,screens]=(await Promise.all([
  db.query(`with pv as (${landingViews}) select current,${viewTotals} from pv group by current`,base),
  db.query(`with pv as (${landingViews}) select g.d::date::text as day,count(pv.id)::int as views,count(distinct pv.visitor)::int as visitors,
    round(avg(pv.seconds))::int as avg_seconds,round(avg(pv.scroll_pct))::int as avg_scroll
    from ${series} left join pv on pv.current and ${localDay('pv.created_at')}=g.d::date group by g.d order by g.d`,base),
  db.query(`select count(*)::int as views,count(distinct visitor)::int as visitors from public_page_views pv
    where ${analiticaSinDemo('pv')} and ${between('pv.created_at',midnight('$1::date'),midnight('$1::date+1'))}`,[range.today]),
  db.query(`with pv as (${landingViews}) select path,count(*)::int as views,count(distinct visitor)::int as visitors,
    round(avg(seconds))::int as avg_seconds,round(avg(scroll_pct))::int as avg_scroll
    from pv where current group by path order by views desc,path limit 10`,base),
  db.query(`with pv as (${landingViews}) select coalesce(referrer_domain,'') as domain,count(*)::int as views,count(distinct visitor)::int as visitors
    from pv where current group by 1 order by views desc,domain limit 10`,base),
  db.query(`with e as (${events(analiticaSinDemo)}) select current,label,count(*)::int as total,count(distinct visitor)::int as visitors
    from e where event='cta_click' group by current,label`,base),
  db.query(`with e as (${events(analiticaSinDemo)}) select g.d::date::text as day,count(e.id)::int as clicks
    from ${series} left join e on e.current and e.event='cta_click' and ${localDay('e.created_at')}=g.d::date group by g.d order by g.d`,base),
  db.query(`select (u.created_at>=${CUR_START}) as current,count(*)::int as total from users u
    where ${realUser('u')} and ${between('u.created_at',PREV_START,CUR_END)} group by 1`,base),
  db.query(`with e as (${events(analiticaSoloDemo)}) select current,label,count(*)::int as total from e where event='demo_start' group by current,label`,base),
  db.query(`with e as (${events(analiticaSoloDemo)}) select g.d::date::text as day,count(e.id)::int as started
    from ${series} left join e on e.current and e.event='demo_start' and ${localDay('e.created_at')}=g.d::date group by g.d order by g.d`,base),
  db.query(`with e as (${events(analiticaSoloDemo)}) select label,count(*)::int as total,count(distinct visitor)::int as demos
    from e where current and event='demo_role' group by label order by total desc,label`,base),
  db.query(`with pv as (${demoViews}) select current,count(*)::int as views,count(distinct visitor)::int as demos from pv group by current`,base),
  // Duración por demo = segundos visibles acumulados de todas sus pantallas; promedio entre demos con tiempo medido.
  db.query(`with pv as (${demoViews}),per as (select current,visitor,sum(seconds) as total from pv where seconds is not null group by current,visitor)
    select current,round(avg(total))::int as avg_seconds,count(*)::int as demos from per group by current`,base),
  db.query(`with pv as (${demoViews}) select path,count(*)::int as views,count(distinct visitor)::int as demos,round(avg(seconds))::int as avg_seconds
    from pv where current group by path order by views desc,path limit 12`,base),
 ])).map(result=>result.rows);

 const landingCurrent=totalsBy(lTotals,true),landingPrevious=totalsBy(lTotals,false);
 const ctaCurrent=countsBy(ctas,true),ctaPrevious=countsBy(ctas,false);
 const sum=values=>Object.values(values).reduce((total,value)=>total+value,0);
 const startsCurrent=countsBy(dStarts,true),startsPrevious=countsBy(dStarts,false);
 const demoTotals=current=>{const row=dTotals.find(item=>item.current===current)||{};const duration=dDuration.find(item=>item.current===current)||{};
  return {views:int(row.views),demos_with_views:int(row.demos),avg_seconds:num(duration.avg_seconds),timed_demos:int(duration.demos)};};
 const signupsBy=current=>int(signups.find(row=>row.current===current)?.total);
 const ctaDailyMap=new Map(ctaDaily.map(row=>[row.day,int(row.clicks)]));
 const startedCurrent=sum(startsCurrent);
 return {
  range,
  landing:{
   today:{day:range.today,views:int(lToday[0]?.views),visitors:int(lToday[0]?.visitors)},
   totals:{...landingCurrent,cta_clicks:sum(ctaCurrent),signups:signupsBy(true)},
   previous:{...landingPrevious,cta_clicks:sum(ctaPrevious),signups:signupsBy(false)},
   daily:lDaily.map(row=>({day:row.day,views:int(row.views),visitors:int(row.visitors),avg_seconds:num(row.avg_seconds),avg_scroll:num(row.avg_scroll),cta_clicks:ctaDailyMap.get(row.day)||0})),
   pages:pages.map(row=>({path:row.path,views:int(row.views),visitors:int(row.visitors),avg_seconds:num(row.avg_seconds),avg_scroll:num(row.avg_scroll)})),
   referrers:referrers.map(row=>({domain:row.domain||null,views:int(row.views),visitors:int(row.visitors)})),
   ctas:ANALYTICS_CTAS.map(cta=>({cta,clicks:ctaCurrent[cta]||0,previous:ctaPrevious[cta]||0,visitors:int(ctas.find(row=>row.current&&row.label===cta)?.visitors)})),
  },
  demo:{
   totals:{started:startedCurrent,...demoTotals(true),role_changes:roles.reduce((total,row)=>total+int(row.total),0)},
   previous:{started:sum(startsPrevious),...demoTotals(false)},
   kinds:['publica','privada'].map(kind=>({kind,started:startsCurrent[kind]||0,previous:startsPrevious[kind]||0})),
   daily:dDaily.map(row=>({day:row.day,started:int(row.started)})),
   roles:roles.map(row=>({role:row.label,changes:int(row.total),demos:int(row.demos)})),
   screens:screens.map(row=>({path:row.path,views:int(row.views),demos:int(row.demos),avg_seconds:num(row.avg_seconds)})),
   // La demo es anónima y el registro vive en otro dominio: no se cruzan identidades.
   conversion:{measurable:false,reason:'La demo es anónima y el registro vive en app.scaleparaguay.com: no se cruzan identidades entre ambos.'},
  },
 };
}

export async function platformTraffic({req,res,url,db,session,send}){
 if(url.pathname!==TRAFFIC_PATH)return false;
 try{
  if(req.method!=='GET'){send(res,405,{error:'Método no permitido'});return true;}
  await actor(db,session,req);
  const range=analyticsRange({from:url.searchParams.get('from')||undefined,to:url.searchParams.get('to')||undefined},asuncionDay());
  send(res,200,await platformTrafficData(db,range));return true;
 }catch(error){
  if(error.status){send(res,error.status,{error:error.message});return true;}
  throw error;
 }
}
