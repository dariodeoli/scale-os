import assert from 'node:assert/strict';
import {test} from 'node:test';

require.extensions['.css']=()=>{};
const {postLoginDestination}=require('../app/scale-workspace') as typeof import('../app/scale-workspace');

test('fixed Superadmin and strict MCP consent return targets redirect after authentication',()=>{
  assert.equal(postLoginDestination('?next=/superadmin'),'/superadmin');
  assert.equal(postLoginDestination('?next=https://attacker.invalid'),null);
  const consent='/mcp/autorizar?request='+'a'.repeat(43);
  assert.equal(postLoginDestination('?next='+encodeURIComponent(consent)),consent);
  assert.equal(postLoginDestination('?next='+encodeURIComponent(consent+'&next=https://attacker.invalid')),null);
  assert.equal(postLoginDestination('?next='+encodeURIComponent('//attacker.invalid')),null);
});
