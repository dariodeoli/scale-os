export function validateImageLink(source:string):Promise<void>{
 return new Promise((resolve,reject)=>{
  const image=new Image();
  const finish=(error?:Error)=>{clearTimeout(timer);image.onload=null;image.onerror=null;if(error)reject(error);else resolve();};
  const timer=setTimeout(()=>finish(Error('La imagen tardó demasiado en cargar. Probá otro enlace o subí el archivo.')),12000);
  image.referrerPolicy='no-referrer';
  image.onload=()=>finish(image.naturalWidth&&image.naturalHeight?undefined:Error('El enlace no contiene una imagen visible.'));
  image.onerror=()=>finish(Error('No se puede mostrar esta imagen en Scale OS. El sitio puede bloquear enlaces externos o el enlace puede haber vencido. Subí el archivo o usá otra URL pública.'));
  image.src=source;
 });
}
