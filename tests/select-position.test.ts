import assert from 'node:assert/strict';
import {selectPosition} from '../app/select-position';
const down=selectPosition({top:100,bottom:144,left:20,width:300},{width:1000,height:800});
assert.equal(down.top,150);assert.equal(down.maxHeight,380);assert.equal(down.bottom,undefined);
const up=selectPosition({top:600,bottom:644,left:20,width:300},{width:1000,height:800});
assert.equal(up.bottom,206);assert.equal(up.maxHeight,380);assert.equal(up.top,undefined);
for(const height of [320,568,844])for(const top of [20,140,270]){
 const p=selectPosition({top,bottom:top+44,left:250,width:350},{width:390,height});
 assert(p.left>=12);assert(p.left+p.width<=378);assert(p.maxHeight>=0);assert(p.maxHeight<=380);
}
console.log('PASS: select opens toward available space and stays within narrow viewport');
