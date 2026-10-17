// Scale identity policy; no UI, styles, requests or audit formatting.
export function actorInitials(name:string){
 const words=name.trim().split(/\s+/).filter(Boolean);
 return (words.length>1?`${Array.from(words[0])[0]}${Array.from(words[words.length-1])[0]}`:Array.from(words[0]||'?').slice(0,2).join('')).toLocaleUpperCase('es');
}
export function safePhoto(value?:string|null){
 if(!value)return '';
 if(/^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return value;
 // Medios de identidad (#108): la API sirve las fotos guardadas como URL interna
 // cacheable (mismo origen) en vez de repetir el base64 en cada listado.
 if(/^\/core-api\/api\/agency\/media\/(?:person|collaborator|client|organization)\/\d+\?v=[a-f0-9]{10}$/.test(value))return value;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?value:'';}catch{return '';}
}
