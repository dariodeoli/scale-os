export type Feedback={message:string;tone:'success'|'error'|'warning'};
export const feedbackEvent='scale:feedback';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'?value as Record<string,unknown>:{};
export function mutationFeedback(path:string,method:string,body:unknown,data:unknown):Feedback|null{
 if(!path.startsWith('/api/agency/')||!['POST','PATCH','DELETE'].includes(method.toUpperCase()))return null;
 const input=record(body),result=record(data),access=record(result.access);
 if(result.emailSent===false||access.emailSent===false)return{tone:'warning',message:'Acceso guardado, pero el correo no se pudo enviar. Podés reenviarlo desde Equipo.'};
 if(result.alreadyRecorded||result.alreadyReversed)return{tone:'success',message:'La operación ya estaba registrada. No se duplicó.'};
 if(path.includes('/collaborators/')&&Object.hasOwn(input,'photo_url'))return{tone:'success',message:input.photo_url?'Foto guardada correctamente.':'Foto quitada del perfil.'};
 if(path.endsWith('/restore'))return{tone:'success',message:'Registro restaurado. Si su cliente o proyecto sigue en Papelera, restauralo también para verlo.'};
 if(method.toUpperCase()==='DELETE')return{tone:'success',message:path.includes('/members/')?'Acceso retirado de esta empresa.':'Registro movido a Papelera. Podés recuperarlo allí.'};
 if(path.includes('/members'))return{tone:'success',message:result.emailSent===true?'Invitación enviada al proveedor de correo. Revisá también spam.':'Permisos guardados correctamente.'};
 if(path.endsWith('/comments'))return{tone:'success',message:'Comentario publicado.'};
 if(path.includes('/work-orders/')&&Object.hasOwn(input,'status')||path.includes('/leads/')&&Object.hasOwn(input,'stage'))return{tone:'success',message:'Tarjeta movida y guardada.'};
 if(path.endsWith('/reverse'))return{tone:'success',message:'Cobro revertido. Saldos y factura actualizados.'};
 if(path.endsWith('/payments'))return{tone:'success',message:'Cobro registrado. Saldo pendiente actualizado.'};
 if(path.endsWith('/payouts'))return{tone:'success',message:'Pago registrado y descontado de la cuenta.'};
 if(path.endsWith('/transfers'))return{tone:'success',message:'Transferencia registrada. Ambas cuentas actualizadas.'};
 return{tone:'success',message:'Cambios guardados correctamente.'};
}
export function notify(feedback:Feedback){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<Feedback>(feedbackEvent,{detail:feedback}));}
export function notifyMutation(path:string,method:string,body:unknown,data:unknown){const feedback=mutationFeedback(path,method,body,data);if(feedback)notify(feedback);}
