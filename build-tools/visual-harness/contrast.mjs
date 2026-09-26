/* Cálculo de contraste AA compartido por el auditor y el probe por ruta (#60). */
export const CONTRAST_JS=`(()=>{
 const parse=(value)=>{const m=value.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const parts=m[1].split(',').map(v=>Number(v.trim()));const [r,g,b]=parts;const a=parts.length>3?parts[3]:1;return {r,g,b,a};};
 const blend=(front,back)=>{const a=front.a+back.a*(1-front.a);if(a<=0)return {r:0,g:0,b:0,a:0};const mix=(f,b)=>Math.round((f*front.a+b*back.a*(1-front.a))/a);return {r:mix(front.r,back.r),g:mix(front.g,back.g),b:mix(front.b,back.b),a};};
 const lum=({r,g,b})=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
 const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
 const background=(el)=>{let node=el,acc={r:0,g:0,b:0,a:0};const chain=[];
  while(node&&node!==document.documentElement.parentElement){const style=getComputedStyle(node);const bg=parse(style.backgroundColor);
   // El gradiente pinta por encima del color de fondo: se usa su primer color (KPI y
   // tarjetas de marca); medir contra la página daría falsos positivos.
   // Tailwind emite el gradiente con var(--tw-gradient-stops): se resuelven las
   // variables --tw-gradient-* cuando el texto del gradiente no trae colores.
   let grad=null;
   if(style.backgroundImage&&style.backgroundImage!=='none'){
    const stops=[...style.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m=>parse(m[0])).filter(Boolean);
    grad=stops.find(stop=>stop.a>0)||null;
    if(!grad){for(const name of ['--tw-gradient-from','--tw-gradient-to']){const value=(style.getPropertyValue(name)||'').trim();const color=value?parse(value):null;if(color&&color.a>0){grad=color;break;}}}
   }
   if(grad&&grad.a>0){chain.push(grad);if(grad.a>=1)break;}
   else if(bg&&bg.a>0){chain.push(bg);if(bg.a>=1)break;}
   node=node.parentElement;}
  chain.reverse();for(const layer of chain)acc=blend(layer,acc.a?acc:{r:255,g:255,b:255,a:1});
  return acc.a?acc:{r:255,g:255,b:255,a:1};};
 const skip=(el,style)=>{if(el.closest('[aria-hidden="true"]'))return true;if(style.display==='none'||style.visibility==='hidden')return true;if(Number(style.opacity)===0)return true;if(el.disabled)return true;if(el.closest('svg'))return true;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)return true;return false;};
 const out=[];let chipFailures=0;
 const inShell=(el)=>Boolean(el.closest('nav,aside,.desktop-sidebar,.sidebar,.workspace-topbar,.workspace-page-header,.mobile-navigation,[aria-label="Menú principal"]'));
 const nodes=[...document.querySelectorAll('main *')].filter(el=>!inShell(el));
 for(const el of nodes){
  const style=getComputedStyle(el);
  if(skip(el,style))continue;
  const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>0);
  if(!own.length)continue;
  const size=parseFloat(style.fontSize),weight=Number(style.fontWeight)||400;
  const large=size>=24||(size>=18.66&&weight>=700);
  const fg=parse(style.color);if(!fg)continue;
  const bg=background(el);
  const text=fg.a<1?blend(fg,bg):fg;
  const value=Math.round(ratio(text,bg)*100)/100;
  const threshold=large?3:4.5;
  if(value<threshold){out.push({text:el.textContent.trim().slice(0,40),tag:el.tagName,cls:String(el.className).slice(0,60),size,weight,ratio:value,threshold,fg:style.color,bg:'rgb('+bg.r+','+bg.g+','+bg.b+')'});if(String(el.className).includes('rounded-md border px-2'))chipFailures+=1;}
 }
 // Límites interactivos (UI): borde/fondo de controles contra su contorno.
 const controls=[...document.querySelectorAll('main input:not([type=checkbox]):not([type=hidden]),main textarea,main select,main button,main [role="button"]')].filter(el=>!inShell(el)).slice(0,80);
 const uiOut=[];
 for(const el of controls){
  const style=getComputedStyle(el);
  if(skip(el,style))continue;
  // Un borde de 0px no es una affordance visible: el color computado
  // (currentColor heredado) no puede medirse como límite del control.
  if(parseFloat(style.borderTopWidth)<=0||style.borderTopStyle==='none')continue;
  const bg=parse(style.backgroundColor);const border=parse(style.borderTopColor);
  const outer=background(el.parentElement||el);
  if(bg&&bg.a===0&&border&&border.a>0){const value=Math.round(ratio(border,outer)*100)/100;if(value<3)uiOut.push({tag:el.tagName,cls:String(el.className).slice(0,50),kind:'borde',ratio:value,label:String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').slice(0,30)});}
 }
 return {failures:out.slice(0,12),failureCount:out.length,chipFailures,checked:nodes.length,uiFailures:uiOut.slice(0,6),uiFailureCount:uiOut.length,uiChecked:controls.length};})()`;
