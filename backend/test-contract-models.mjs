import assert from 'node:assert/strict';
import {BUILTIN_CONTRACT_MODELS} from './contract-models.js';
import {contractBody,contractMissing,renderContractText,contractHtml} from './contracts.js';

assert.equal(BUILTIN_CONTRACT_MODELS.length,4);
assert.equal(new Set(BUILTIN_CONTRACT_MODELS.map(model=>model.key)).size,4);
for(const model of BUILTIN_CONTRACT_MODELS){
  assert.equal(contractBody(model.body),model.body);
  assert.ok(model.required_fields.length>15);
  assert.deepEqual(contractMissing(model.body,{},model.required_fields).sort(),[...model.required_fields].sort());
  assert.ok(!/\b\d{6,}\b/.test(model.body),'models contain no literal personal identifiers or price defaults');
  assert.ok(!/\[completar\]|\[MONTO\]|\[NOMBRE/i.test(model.body),'every placeholder is validated and discoverable');
  const variables=Object.fromEntries(model.required_fields.map(key=>[key,key.startsWith('company.')?'Empresa de prueba':key.startsWith('counterparty.')?'Contraparte de prueba':'Condición revisada']));
  const rendered=renderContractText(model.body,variables);
  assert.deepEqual(contractMissing(model.body,variables,model.required_fields),[]);
  assert.ok(!rendered.includes('{{'));
  assert.ok(rendered.includes('Firma:'));
  assert.ok(contractHtml({title:model.name,version:1,rendered_text:rendered}).includes('Documento revisado por una persona'));
}
const packageModel=BUILTIN_CONTRACT_MODELS.find(model=>model.key==='audiovisual-package');
assert.ok(packageModel.body.includes('no se renueva automáticamente'));
assert.ok(packageModel.required_fields.includes('agreement.ends_on'));
assert.ok(BUILTIN_CONTRACT_MODELS.find(model=>model.key==='marketing-preferential').required_fields.includes('agreement.notes'));
console.log('PASS contract models: four editable structures, complete validated placeholders, no identifier/price defaults, manual commercial terms and explicit package/nonrenewal semantics');
