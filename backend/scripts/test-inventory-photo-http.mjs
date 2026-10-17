import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {inventoryReservations} from '../inventory-reservations.js';

// The same HTTP regression runs against PGlite and PostgreSQL. No external
// URL is fetched: external sources are inspected with redirect:'manual'.
export async function inventoryPhotoHttpCases({db,query,owner,viewer,foreign}){
 const actors={owner,viewer,foreign};
 const server=createServer(async(req,res)=>{
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const payload=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
   const url=new URL(req.url.replace(/^\/core-api(?=\/)/,''),`http://${req.headers.host}`);
   const handled=await inventoryReservations({req,res,url,db,session:async()=>actors[req.headers['x-test-actor']],body:async()=>payload,send:(_,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}});
   if(!handled){res.writeHead(404);res.end();}
  }catch(error){res.writeHead(500);res.end(String(error));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const request=(path,method='GET',payload,actor='owner',headers={},redirect='manual')=>fetch(origin+path,{method,headers:{'x-test-actor':actor,...(payload===undefined?{}:{'content-type':'application/json'}),...headers},...(payload===undefined?{}:{body:JSON.stringify(payload)}),redirect});
 const api='/api/agency/inventory';
 const json=async(path,method,payload,actor='owner',headers={})=>{const response=await request(path,method,payload,actor,headers);return {status:response.status,...await response.json()};};
 const tinyPng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
 try{
  const created=await json(api,'POST',{name:'HTTP photo regression',photo_url:tinyPng});assert.equal(created.status,201,JSON.stringify(created));
  const id=created.record.id,path=`${api}/${id}`,photoPath=`${path}/photo`;
  const original=(await query('select photo_url,photo_updated_at from agency_inventory where id=$1',[id])).rows[0];
  const expected=Buffer.from(original.photo_url.split(',')[1],'base64');
  const proxy={'x-forwarded-host':'api.scaleparaguay.com, internal.invalid','x-forwarded-proto':'https, http'};
  for(const headers of [{},proxy,{'x-forwarded-host':'api.fixture.invalid','x-forwarded-proto':'https'}]){
   const fetched=await json(path,'GET',undefined,'owner',headers);assert.equal(fetched.status,200);
   const full={...fetched.record,name:'Renamed through HTTP'};
   const renamed=await json(path,'PATCH',full,'owner',headers);assert.equal(renamed.status,200,JSON.stringify(renamed));
   const stored=(await query('select photo_url,photo_updated_at from agency_inventory where id=$1',[id])).rows[0];
   assert.equal(stored.photo_url,original.photo_url,'absolute GET -> name PATCH must preserve bytes');
   assert.equal(new Date(stored.photo_updated_at).getTime(),new Date(original.photo_updated_at).getTime(),'round-trip preserves photo stamp');
   for(const redirect of ['manual','follow']){
    const response=await request(photoPath,'GET',undefined,'owner',headers,redirect);assert.equal(response.status,200);assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('content-type'),'image/webp');assert.deepEqual(Buffer.from(await response.arrayBuffer()),expected);
   }
  }
  await query("update agency_inventory set photo_updated_at=to_timestamp(0) where id=$1",[id]);
  const zero=(await json(path,'GET')).record.photo_url;assert.match(zero,/\?v=0$/);
  for(const photo_url of [photoPath,`/core-api${photoPath}?v=0`,`${origin}/core-api${photoPath}?v=0`,`https://app.scaleparaguay.com/core-api${photoPath}?v=0`]){
   assert.equal((await json(path,'PATCH',{name:'Core API reference',photo_url})).status,200);
   assert.equal((await query('select photo_url from agency_inventory where id=$1',[id])).rows[0].photo_url,original.photo_url);
  }
  assert.equal(new Date((await query('select photo_updated_at from agency_inventory where id=$1',[id])).rows[0].photo_updated_at).getTime(),0,'round-trip must preserve epoch0 stamp');
  assert.equal((await request(`/core-api${photoPath}`,'GET',undefined,'viewer',{},'follow')).status,200);
  assert.equal((await request(photoPath,'GET',undefined,'anonymous')).status,401);
  assert.equal((await json(path,'PATCH',{photo_url:''},'viewer')).status,403);
  assert.equal((await request(photoPath,'GET',undefined,'foreign')).status,404);
  assert.equal((await json(path,'PATCH',{name:'Foreign edit',photo_url:origin+photoPath},'foreign')).status,400);
  const second=await json(api,'POST',{name:'Second photo fixture'});assert.equal(second.status,201);
  const foreignItem=await json(api,'POST',{name:'Foreign photo fixture'},'foreign');assert.equal(foreignItem.status,201);
  for(const referenceId of [second.record.id,foreignItem.record.id]){
   for(const photo_url of [`${api}/${referenceId}/photo`,`${origin}${api}/${referenceId}/photo`,`https://api.scaleparaguay.com${api}/${referenceId}/photo`])assert.equal((await json(path,'PATCH',{photo_url})).status,400,'cross-item reference rejected without exposing existence');
  }
  assert.equal((await json(api,'POST',{name:'Cannot link internal endpoint',photo_url:photoPath})).status,400);
  assert.equal((await json(`${api}/${second.record.id}`,'PATCH',{photo_url:`${api}/${second.record.id}/photo`})).status,400,'missing bytes cannot be fabricated');
  // The latest photo transition alone can prove a recoverable overwritten
  // image. Name-only edits don't supersede that transition; no DB rewrite.
  const setPhoto=value=>query('update agency_inventory set photo_url=$2,photo_updated_at=now() where id=$1',[id,value]);
  const checkRecovered=async(bytes=expected)=>{
   for(const redirect of ['manual','follow']){const response=await request(photoPath,'GET',undefined,'owner',{},redirect);assert.equal(response.status,200,response.status===200?'':await response.text());assert.equal(response.headers.get('location'),null);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);}
  };
  await setPhoto(origin+photoPath);
  await query("update agency_inventory set name='Legacy renamed' where id=$1",[id]);
  await checkRecovered();
  assert.equal((await query('select photo_url from agency_inventory where id=$1',[id])).rows[0].photo_url,origin+photoPath,'recovery must never rewrite the item');
  await new Promise(resolve=>setTimeout(resolve,10));
  await setPhoto(null);await setPhoto(origin+photoPath);
  await query("delete from agency_operation_audit where id in (select id from agency_operation_audit where organization_id=$1 and table_name='agency_inventory' and after_state->>'id'=$2 order by id desc limit 2)",[owner.organization_id,String(id)]);
  assert.equal((await request(photoPath)).status,422,'pruned latest transition cannot expose an earlier image even with identical URL');
  await setPhoto(null);await setPhoto(origin+photoPath);
  assert.equal((await request(photoPath)).status,422,'clear is a hard history boundary');
  for(const action of ['INSERT','DELETE']){
   const before=action==='DELETE'?{id,organization_id:owner.organization_id,photo_url:original.photo_url}:null;
   const after=action==='INSERT'?{id,organization_id:owner.organization_id,photo_url:origin+photoPath}:null;
   await query("insert into agency_operation_audit(organization_id,table_name,action,before_state,after_state,created_at) select $1,'agency_inventory',$2,$3,$4,photo_updated_at from agency_inventory where id=$5",[owner.organization_id,action,JSON.stringify(before),JSON.stringify(after),id]);
   assert.equal((await request(photoPath)).status,422,`${action} transition cannot be skipped to recover older bytes`);
  }

  const otherPng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  assert.equal((await json(path,'PATCH',{photo_url:otherPng})).status,200);
  const replacement=(await query('select photo_url from agency_inventory where id=$1',[id])).rows[0].photo_url;
  assert.notEqual(replacement,original.photo_url);
  await setPhoto(origin+photoPath);await checkRecovered(Buffer.from(replacement.split(',')[1],'base64'));
  await setPhoto('data:image/png;base64,ZmFrZQ==');await setPhoto(origin+photoPath);
  assert.equal((await request(photoPath)).status,422,'invalid raster history is not served');
  await setPhoto('https://example.invalid/previous.png');await setPhoto(origin+photoPath);
  const previousExternal=await request(photoPath);assert.equal(previousExternal.status,422,'historical external URLs are not recovered');assert.equal(previousExternal.headers.get('location'),null);
  // A cross-item chain is never recovered, even if its preceding source was valid.
  await setPhoto(original.photo_url);await setPhoto(`${origin}${api}/${second.record.id}/photo`);
  assert.equal((await request(photoPath)).status,422);
  // Missing/pruned history and unrelated tenant/id audit rows never grant access.
  await query("delete from agency_operation_audit where organization_id=$1 and table_name='agency_inventory' and (before_state->>'id'=$2 or after_state->>'id'=$2)",[owner.organization_id,String(id)]);
  for(const [auditOrg,auditId] of [[foreign.organization_id,id],[owner.organization_id,second.record.id]]){
   const before={id:auditId,organization_id:auditOrg,photo_url:original.photo_url};const after={...before,photo_url:origin+photoPath};
   await query("insert into agency_operation_audit(organization_id,table_name,action,before_state,after_state) values($1,'agency_inventory','UPDATE',$2,$3)",[auditOrg,JSON.stringify(before),JSON.stringify(after)]);
  }
  for(const photo_url of [photoPath,`/core-api${photoPath}`,origin+photoPath,`${origin}${api}/${second.record.id}/photo`,`https://api.scaleparaguay.com${photoPath}`]){
   await query('update agency_inventory set photo_url=$2 where id=$1',[id,photo_url]);
   for(const redirect of ['manual','follow']){const response=await request(photoPath,'GET',undefined,'owner',{},redirect);assert.equal(response.status,422);assert.equal(response.headers.get('location'),null);await response.text();}
   assert.equal((await query('select photo_url from agency_inventory where id=$1',[id])).rows[0].photo_url,photo_url,'legacy source remains intact for audited recovery');
  }
  for(const photo_url of ['https://example.invalid/equipment.png',`https://images.example.invalid${photoPath}`]){
   assert.equal((await json(path,'PATCH',{photo_url})).status,200);
   const external=await request(photoPath);assert.equal(external.status,302);assert.equal(external.headers.get('location'),photo_url);
  }
  assert.equal((await json(path,'PATCH',{photo_url:tinyPng})).status,200,'upload can repair legacy link');
  assert.equal((await request(photoPath,'GET',undefined,'owner',{},'follow')).status,200);
  assert.equal((await json(path,'DELETE')).status,200);assert.equal((await request(photoPath)).status,404,'archived photos remain hidden');
  assert.equal((await json(`${path}/restore`,'POST',{})).status,200);
  for(const photo_url of ['',null]){
   assert.equal((await json(path,'PATCH',{photo_url})).status,200);assert.equal((await request(photoPath)).status,404);
   assert.equal((await query('select photo_url from agency_inventory where id=$1',[id])).rows[0].photo_url,null);
  }
  console.log('PASS inventory photo HTTP: proxy/core-api round-trips, original bytes/stamp0, manual/follow, audited read-only recovery/clear boundaries, legacy cycles finite, cross-item/tenant/roles, external HTTPS, upload/clear/archive');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
