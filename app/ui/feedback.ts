/** Generic notification payload, event and bounded presentation queue. No endpoints or mutation mapping. */
export type Feedback={message:string;tone:'success'|'error'|'warning';source?:'mutation'};
export const feedbackEvent='scale:feedback';
/** Confirmation toasts stay on screen only 2-3 seconds. */
export const feedbackDuration=(tone:Feedback['tone'])=>tone==='success'?2000:3000;
export function notify(feedback:Feedback){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<Feedback>(feedbackEvent,{detail:feedback}));}
/**
 * Pila visible (máx. 3): un mismo texto no se repite y, cuando la pantalla anuncia
 * su propio éxito («Espacio guardado.»), reemplaza al genérico automático del mismo
 * guardado en vez de apilar dos avisos por una sola acción.
 */
export function stackFeedback<T extends Feedback>(current:T[],incoming:T):T[]{
 const explicitSuccess=incoming.tone==='success'&&incoming.source!=='mutation';
 return [...current.filter(item=>item.message!==incoming.message&&!(explicitSuccess&&item.tone==='success'&&item.source==='mutation')),incoming].slice(-3);
}
