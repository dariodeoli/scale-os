/**
 * Encuadre del recortador de fotos (#107).
 *
 * La foto se guarda **completa** (sin recorte automático): acá solo se decide
 * dónde arranca la ventana cuadrada del recortador manual. En verticales la
 * ventana arranca apenas arriba del centro —donde suele estar la cabeza— y el
 * zoom queda en manos del usuario.
 */
export function initialCropArea(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Dimensiones de foto inválidas.');
 const vertical=height>width*1.15;
 return {x:0,y:vertical?-16:0};
}
