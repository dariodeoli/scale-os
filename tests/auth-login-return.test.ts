import assert from 'node:assert/strict';
import {test} from 'node:test';

require.extensions['.css']=()=>{};
const {postLoginDestination}=require('../app/scale-workspace') as typeof import('../app/scale-workspace');

test('only the fixed Superadmin return target redirects after authentication',()=>{
  assert.equal(postLoginDestination('?next=/superadmin'),'/superadmin');
  assert.equal(postLoginDestination('?next=https://attacker.invalid'),null);
});
