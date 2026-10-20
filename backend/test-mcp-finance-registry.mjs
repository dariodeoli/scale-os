import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {mcpFinanceTools,mcpFinanceOverrides,financeCoverage,financeGaps} from './mcp-finance-tools.js';
const ajv=new Ajv({strict:false,allErrors:true});addFormats(ajv);
const all=[...mcpFinanceTools,...mcpFinanceOverrides];
assert.equal(new Set(all.map(d=>d.name)).size,all.length);
for(const definition of all){
 assert.equal(definition.inputSchema.additionalProperties,false);ajv.compile(definition.inputSchema);
 const args={};for(const key of Object.keys(definition.inputSchema.properties))args[key]=key==='month'?'2026-07':key==='id'||key==='applicationId'?'42':key==='accountId'?'17':key==='limit'?20:key==='offset'?0:undefined;
 const resolved=definition.resolve(args);assert.ok(resolved.path.startsWith('/api/agency/'));assert.ok(!resolved.path.includes('undefined'));assert.ok(!resolved.path.includes(':'));assert.ok(!resolved.path.includes('?'));
 if(mcpFinanceTools.includes(definition)&&definition.scope==='scale:write'){
  assert.equal(definition.financial,true,'All finance writes require recent real OAuth login+consent');
  assert.equal(definition.inputSchema.properties.confirm.const,true);
 }
}
const byName=name=>all.find(d=>d.name===name),validate=(name,args)=>ajv.compile(byName(name).inputSchema)(args);
const receipt={confirm:true,data:{mode:'unassigned',accountId:'42',amount:'12.50',receivedOn:'2026-07-12',requestId:'11111111-1111-4111-8111-111111111111'}};
assert.equal(validate('scale_receive_payment',receipt),true,'Valid free receipt without client');
assert.equal(validate('scale_receive_payment',{...receipt,data:{...receipt.data,organization_id:'99'}}),false,'No model tenant override');
assert.equal(validate('scale_receive_payment',{...receipt,data:{...receipt.data,amount:12.5}}),false,'Monetary input stays exact transport string');
assert.equal(validate('scale_receive_payment',{...receipt,confirm:false}),false);
assert.equal(validate('scale_receive_payment',{...receipt,url:'https://attacker.invalid'}),false);
assert.equal(validate('scale_list_receipts',{limit:101}),false);
assert.equal(validate('scale_get_treasury',{month:'2026-13'}),false);
assert.equal(validate('scale_get_treasury',{month:'2026-07',query:'tenant=other'}),false);
assert.equal(validate('scale_close_finance_period',{month:'2026-07',confirm:true,data:{reason:'QA explicit monthly close',expectedRevision:0}}),true);
assert.equal(validate('scale_close_finance_period',{month:'2026-07',confirm:true,data:{reason:'QA explicit monthly close',expectedRevision:'0'}}),false);
assert.ok(all.find(d=>d.name==='scale_create_payout').inputSchema.properties.data.required.includes('requestId'),'Payout writes require canonical request idempotency');
assert.ok(all.find(d=>d.name==='scale_create_commission').inputSchema.properties.data.required.includes('requestId'),'Commission creates require canonical request idempotency');
const coverage=JSON.parse(await readFile(new URL('./mcp-finance-coverage.json',import.meta.url),'utf8'));
assert.deepEqual(coverage,[...financeCoverage,...financeGaps],'Machine-readable inventory is synchronized');
for(const definition of all)assert.ok(coverage.find(row=>row.tool===definition.name&&row.status!=='canonical-limitation'));
console.log(`PASS finance registry #330: ${all.length} unique tools, compiled strict schemas, exact money transport, fixed route/query resolvers, recent-auth flags, negative arguments and synchronized route inventory.`);
