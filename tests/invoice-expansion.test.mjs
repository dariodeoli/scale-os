import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const source=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
const body=source.split('async function loadAllInvoices(){')[1].split('\n  useEffect(')[0].replace(/\n  }\s*$/,'').replace('request<{invoices:Invoice[];hasMore?:boolean}>','request');
function fixture(request){
  const state={rows:['existing'],more:true,all:false,loading:false,toasts:[]};
  const pending={current:false},sequence={current:1};
  const run=new Function('request','invoiceRequestPending','operationalAccess','dataLoadSequence','setLoadingAllInvoices','setInvoices','setInvoiceHasMore','setAllInvoicesLoaded','setToast',`return async function(){${body}}`)(request,pending,true,sequence,v=>state.loading=v,v=>state.rows=v,v=>state.more=v,v=>state.all=v,v=>state.toasts.push(v));
  return {state,run,sequence};
}
test('invoice expansion is single-flight and preserves backend pagination',async()=>{
  let resolve,calls=0;
  const f=fixture(()=>{calls++;return new Promise(r=>resolve=r);});
  const first=f.run();await f.run();
  assert.equal(calls,1);assert.equal(f.state.loading,true);
  resolve({invoices:['all'],hasMore:true});await first;
  assert.deepEqual(f.state.rows,['all']);assert.equal(f.state.more,true);assert.equal(f.state.loading,false);
});
test('invoice expansion failure preserves records and allows retry',async()=>{
  let calls=0;
  const f=fixture(async()=>{if(++calls===1)throw Error('offline');return {invoices:['new'],hasMore:false};});
  await f.run();assert.deepEqual(f.state.rows,['existing']);assert.equal(f.state.more,true);assert.equal(f.state.loading,false);assert.equal(f.state.toasts.length,1);
  await f.run();assert.deepEqual(f.state.rows,['new']);assert.equal(f.state.more,false);
});
test('invoice expansion discards a response after workspace data invalidation',async()=>{
  let resolve;
  const f=fixture(()=>new Promise(r=>resolve=r));const first=f.run();
  f.sequence.current++;
  resolve({invoices:['stale']});await first;
  assert.deepEqual(f.state.rows,['existing']);assert.equal(f.state.all,false);assert.equal(f.state.loading,false);
});
