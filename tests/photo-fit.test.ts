import assert from 'node:assert/strict';
import {initialCropArea} from '../app/photo-fit';
// #107: sin autozoom ni autoencuadre. La ventana del recortador arranca centrada
// y, en verticales, apenas arriba del centro (donde está la cabeza).
for(const [w,h] of [[1600,900],[1000,100],[512,512],[900,1035]]){
 const area=initialCropArea(w,h);
 assert.equal(area.x,0,'el encuadre no se corre en horizontal');
 assert.equal(area.y,0,`${w}×${h}: sin sesgo para horizontales o verticales leves`);
}
for(const [w,h] of [[900,1600],[100,1000],[300,900],[512,683]]){
 const area=initialCropArea(w,h);
 assert.equal(area.x,0);
 assert.equal(area.y,-16,`${w}×${h}: la vertical arranca arriba del centro`);
 assert(area.y>-h,'el sesgo es un corrimiento chico, no un recorte del encuadre');
}
assert.throws(()=>initialCropArea(0,5));assert.throws(()=>initialCropArea(NaN,5));
console.log('PASS: el recortador arranca sin zoom extra y con la ventana arriba del centro solo en verticales');
