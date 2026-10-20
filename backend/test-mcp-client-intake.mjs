import assert from 'node:assert/strict';
import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv-provider.js';
import {mcpClientIntakeTools,mcpClientIntakeHandlers} from './mcp-client-intake-tools.js';
import {clientIntake} from './client-intake.js';
const provider=new AjvJsonSchemaValidator();
assert.deepEqual(mcpClientIntakeHandlers,[clientIntake]);assert.equal(mcpClientIntakeTools.length,6);assert.equal(new Set(mcpClientIntakeTools.map(tool=>tool.name)).size,6);
for(const tool of mcpClientIntakeTools){
 assert.equal(tool.cap,'clients.manage');const validate=provider.getValidator(tool.inputSchema),write=tool.method!=='GET';
 const args={};if(tool.inputSchema.required.includes('id'))args.id='12';
 if(write){args.confirm=true;args.data=tool.name.includes('create_')?{scope:'basic'}:tool.name.includes('review_')?{action:'reject'}:{};}
 assert(validate(args).valid,tool.name+' valid typed arguments');assert(!validate({...args,url:'https://host.invalid'}).valid,'cannot supply routing context');assert(!validate({...args,organization_id:'2'}).valid,'cannot inject tenant');
 const route=tool.resolve(args);assert(route.path.startsWith('/api/agency/'));assert(!route.path.includes('undefined'));assert(!route.path.includes('?'));
 if(write){assert(!validate({...args,confirm:false}).valid);assert(!validate({...args,data:{...args.data,organization_id:'2'}}).valid);assert(!validate({...args,data:{...args.data,token:'synthetic'}}).valid);}
}
const review=mcpClientIntakeTools.find(tool=>tool.name==='scale_review_client_intake_submission'),validate=provider.getValidator(review.inputSchema),base={id:'2',confirm:true};
assert(!validate({...base,data:{action:'link',fields:['email'],client_id:'3'}}).valid,'link requires current revision');
assert(!validate({...base,data:{action:'create',fields:[]}}).valid);assert(!validate({...base,data:{action:'link',fields:['password'],client_id:'3',expected_updated_at:'2026-10-20T01:02:03.000Z'}}).valid);
assert(validate({...base,data:{action:'link',fields:['email'],client_id:'3',expected_updated_at:'2026-10-20T01:02:03.000Z'}}).valid);
const create=mcpClientIntakeTools.find(tool=>tool.name==='scale_create_client_intake_link'),issue=provider.getValidator(create.inputSchema);
assert(!issue({confirm:true,data:{scope:'basic',expires_in_days:31}}).valid);assert(!issue({confirm:true,data:{scope:'private'}}).valid);
console.log('PASS MCP intake335: 6 fixed typed canonical tools, live-capability metadata, explicit confirm, tenant/routing/token injection rejection, selected field enum and link revision requirement; root registry wiring tested by integrator');
