export function centeredPhotoArea(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Dimensiones de foto inválidas.');
 const side=Math.min(width,height);
 return {x:(width-side)/2,y:(height-side)/2,width:side,height:side};
}
