// Barrido de PII en logs (PDP — Ley 7593/2025, scale-os#112): los mensajes de
// log nunca llevan correos ni teléfonos completos. La bitácora de datos
// personales guarda referencias, no contenido; esto cubre el texto libre que
// podría colarse en mensajes de error de infraestructura.
const emailPattern=/([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const digitRunPattern=/\d[\d\s().-]{6,}\d/g;

/** Enmascara un correo: `ana@dominio.com` → `a***@dominio.com`. */
export function maskEmail(value){
 return String(value??'').replace(emailPattern,(_,local,domain)=>`${local.slice(0,1)}***@${domain}`);
}

/** Redacta correos y corridas de 8+ dígitos (teléfonos) conservando el final. */
export function redactPiiText(value){
 return maskEmail(value).replace(digitRunPattern,match=>{
  const digits=match.replace(/\D/g,'');
  if(digits.length<8)return match;
  return match.slice(0,Math.max(0,match.length-3)).replace(/\d/g,'•')+match.slice(-3);
 });
}
