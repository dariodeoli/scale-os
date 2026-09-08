"use client";
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,ZoomIn,ZoomOut} from 'lucide-react';
function EnlargedPhoto({photo,name,close}:{photo:string;name:string;close:()=>void}){
 const [zoom,setZoom]=useState(100),panel=useRef<HTMLElement>(null),title=useId();
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
   if(event.key==='Tab'){
    event.stopImmediatePropagation();const buttons=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input')||[]),first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  };
  document.addEventListener('keydown',keyboard,true);return()=>{document.removeEventListener('keydown',keyboard,true);document.body.style.overflow=overflow;previous?.focus();};
 },[close]);
 return createPortal(<div className="photo-overlay" onClick={event=>{if(event.target===event.currentTarget)close();}}><section className="photo-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby={title}>
  <div className="panel-heading"><h2 id={title}>Foto de {name}</h2><button type="button" className="icon-button" onClick={close} aria-label="Cerrar foto ampliada"><X size={20}/></button></div>
  <div className="photo-viewport"><div className="photo-canvas" style={{width:`${zoom}%`,height:`${zoom}%`}}><img src={photo} alt={`Foto ampliada de ${name}`} referrerPolicy="no-referrer"/></div></div>
  <div className="photo-zoom-controls"><button type="button" className="secondary" disabled={zoom<=100} onClick={()=>setZoom(Math.max(100,zoom-50))} aria-label="Reducir foto"><ZoomOut size={18}/></button><label>Zoom <output>{zoom}%</output><input type="range" min="100" max="300" step="50" value={zoom} onChange={event=>setZoom(Number(event.target.value))} aria-label="Nivel de zoom de la foto"/></label><button type="button" className="secondary" disabled={zoom>=300} onClick={()=>setZoom(Math.min(300,zoom+50))} aria-label="Ampliar foto"><ZoomIn size={18}/></button><button type="button" className="text-button" onClick={()=>setZoom(100)}>Ajustar</button></div>
  <p className="form-note">Desplazá la imagen para ver los detalles. La nitidez depende de la foto guardada.</p>
 </section></div>,document.body);
}
export function PhotoViewer({photo,name,size=48}:{photo:string;name:string;size?:number}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="photo-preview-button" style={{width:size,height:size}} aria-label={`Ampliar foto de ${name}`} onClick={()=>setOpen(true)}><img src={photo} alt={`Foto de ${name}`} referrerPolicy="no-referrer"/><span aria-hidden="true"><ZoomIn size={13}/></span></button>{open&&<EnlargedPhoto photo={photo} name={name} close={()=>setOpen(false)}/>}</>;
}
