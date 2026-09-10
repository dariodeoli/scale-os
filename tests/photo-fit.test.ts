import assert from 'node:assert/strict';
import {centeredPhotoArea} from '../app/photo-fit';
for(const [w,h] of [[1600,900],[900,1600],[512,512],[100,1000],[1000,100]]){
 const a=centeredPhotoArea(w,h);assert.equal(a.width,a.height);assert.equal(a.width,Math.min(w,h));
 assert(a.x>=0&&a.y>=0&&a.x+a.width<=w&&a.y+a.height<=h);
 assert.equal(a.x+a.width/2,w/2);assert.equal(a.y+a.height/2,h/2);
}
assert.throws(()=>centeredPhotoArea(0,5));assert.throws(()=>centeredPhotoArea(NaN,5));
console.log('PASS: automatic centered profile crop fills square without empty borders');
