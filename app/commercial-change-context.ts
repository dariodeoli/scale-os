/** Contexto de auditoría común a los editores de términos comerciales. */
export function commercialChangeContext(input:{effectiveFrom:string;reason:string},expectedRevision:string|undefined|null,requestId:string){
 if(typeof expectedRevision!=='string'||!/^(0|[1-9]\d{0,18})$/.test(expectedRevision))throw Error('No se pudo cargar la revisión del plan. Recargá la ficha antes de cambiarlo.');
 if(!/^\d{4}-\d{2}-01$/.test(input.effectiveFrom)||!Number.isFinite(Date.parse(input.effectiveFrom))||new Date(input.effectiveFrom).toISOString().slice(0,10)!==input.effectiveFrom)throw Error('La vigencia del cambio debe ser el primer día de un mes.');
 const reason=input.reason.trim();
 if(reason.length<5||reason.length>1000)throw Error('Escribí un motivo del cambio de 5 a 1000 caracteres.');
 return {effectiveFrom:input.effectiveFrom,reason,requestId,expectedRevision};
}
