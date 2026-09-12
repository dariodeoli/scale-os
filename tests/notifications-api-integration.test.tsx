import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';

// Opt in with SCALE_NOTIFICATIONS_API_DIR pointing at the paired API checkout.
// Uses the real API handler/SQL and an isolated in-memory database, never HTTP.
const backend=process.env.SCALE_NOTIFICATIONS_API_DIR;
test('real bell + paired API: filtered SQL, exact global counts, pagination, resolution and tenant isolation',{skip:!backend},async t=>{
 const requireBackend=createRequire(resolve(backend!,'package.json'));
 const {PGlite}=requireBackend('@electric-sql/pglite');
 const {notifications}=await import(pathToFileURL(resolve(backend!,'notifications.js')).href);
 const pg=new PGlite();
 await pg.exec(`
  create table organizations(id bigint primary key,active boolean);
  create table organization_members(organization_id bigint,user_id bigint,active boolean,removed_at timestamptz);
  create table agency_notifications(id bigint primary key,organization_id bigint,user_id bigint,kind text,title text,body text,work_order_id bigint,project_id bigint,created_at timestamptz default now(),read_at timestamptz,resolved_at timestamptz,email_status text default 'pending');
  insert into organizations values(1,true),(2,true);
  insert into organization_members values(1,1,true,null),(1,2,true,null),(2,1,true,null);
  insert into agency_notifications(id,organization_id,user_id,kind,title,body,read_at,resolved_at)
   select n,1,1,'assignment','Aviso '||n,'Asignación de fixture',case when n%2=0 or n%3=0 then now() else null end,case when n%3=0 then now() else null end from generate_series(1,35)n;
  insert into agency_notifications(id,organization_id,user_id,title) values(101,2,1,'OTRA EMPRESA'),(102,1,2,'OTRA PERSONA');
 `);
 const client={query:(sql:string,values?:unknown[])=>pg.query(sql,values),release:()=>{}};
 const db={...client,connect:async()=>client};
 const requests:{path:string;method:string}[]=[];
 Object.assign(globalThis,{React,document:{hidden:false},window:new EventTarget()});require.extensions['.css']=()=>{};
 const navId=require.resolve('next/navigation');require.cache[navId]={id:navId,filename:navId,loaded:true,exports:{useRouter:()=>({push:()=>{}})}} as NodeModule;
 const dialogId=require.resolve('../app/dialog');require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>}} as NodeModule;
 t.mock.method(globalThis,'setInterval',(()=>0) as any);t.mock.method(globalThis,'clearInterval',(()=>{}) as any);
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input).replace(/^\/core-api/,''),'https://isolated.invalid');
  requests.push({path:url.pathname+url.search,method:init?.method||'GET'});
  assert(url.pathname.startsWith('/api/agency/notifications'));
  let response!:Response;
  await notifications({req:{method:init?.method||'GET',socket:{}},res:{},url,db,session:async()=>({id:1,organization_id:1,role:'editor'}),body:async()=>init?.body?JSON.parse(String(init.body)):{},send:(_:unknown,status:number,data:unknown)=>{response=Response.json(data,{status});}});
  return response;
 });
 const {NotificationBell}=require('../app/notifications-ui') as typeof import('../app/notifications-ui');
 const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
 let renderer!:ReactTestRenderer;
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 // Void UI handlers start real asynchronous SQL; settle until its rendered state.
 async function waitFor(predicate:()=>boolean){for(let i=0;i<200;i++){await act(async()=>{await settle();});if(predicate())return;}assert.fail('UI did not reach expected state');}
 try{
  await act(async()=>{renderer=create(<NotificationBell openOrder={()=>{}}/>);});
  await waitFor(()=>!renderer.root.findByProps({className:'icon-button notification-trigger'}).props['aria-label'].includes('no disponible'));
  await act(async()=>renderer.root.findByProps({className:'icon-button notification-trigger'}).props.onClick());
  await waitFor(()=>renderer.root.findAllByType('article').length===30);
  const click=async(label:string)=>{await act(async()=>renderer.root.findAllByType('button').find(button=>text(button)===label)!.props.onClick());};
  const titles=()=>renderer.root.findAllByType('article').map(article=>text(article.findByType('h3')));
  const expected=(status:string)=>pg.query(`select title from agency_notifications where organization_id=1 and user_id=1 ${status==='unread'?'and read_at is null':status==='unresolved'?'and resolved_at is null':status==='resolved'?'and resolved_at is not null':''} order by id desc`);
  await click('Ver avisos anteriores');await waitFor(()=>titles().length===35);assert(requests.some(r=>r.path.includes('status=all&before=6')));
  const counts=(await pg.query('select count(*) filter(where read_at is null)::int unread,count(*) filter(where resolved_at is null)::int pending from agency_notifications where organization_id=1 and user_id=1')).rows[0];
  for(const [label,status] of [['Sin leer','unread'],['Pendientes','unresolved'],['Resueltas','resolved']]){
   const want=(await expected(status)).rows.map((row:any)=>row.title);
   await click(label);await waitFor(()=>JSON.stringify(titles())===JSON.stringify(want));
   assert(text(renderer.root).includes(`${counts.unread} sin leer en total · ${counts.pending} avisos pendientes en total`));
  }
  await click('Pendientes');await waitFor(()=>titles().includes('Aviso 35'));
  await click('Resolver aviso');await waitFor(()=>!titles().includes('Aviso 35'));
  const resolved=(await pg.query('select read_at,resolved_at from agency_notifications where id=35')).rows[0];assert(resolved.read_at&&resolved.resolved_at);
  await click('Resueltas');await waitFor(()=>titles().includes('Aviso 35'));await click('Reabrir aviso');await waitFor(()=>!titles().includes('Aviso 35'));
  const reopened=(await pg.query('select read_at,resolved_at from agency_notifications where id=35')).rows[0];assert(reopened.read_at);assert.equal(reopened.resolved_at,null);
  await click('Marcar todas como leídas');await waitFor(()=>text(renderer.root).includes('0 sin leer en total'));
  assert.equal((await pg.query('select count(*)::int n from agency_notifications where id in(101,102) and read_at is null')).rows[0].n,2);
  assert(!text(renderer.root).includes('OTRA EMPRESA'));assert(!text(renderer.root).includes('OTRA PERSONA'));
 }finally{if(renderer)act(()=>renderer.unmount());await pg.close();}
});
