"use client";
import {useId,useRef,useState} from 'react';
import {useOverlay} from './dialog';
import {createPortal} from 'react-dom';
import {X,ZoomIn,ZoomOut} from 'lucide-react';
import './photo-cropper.css';
function EnlargedPhoto({photo,name,close}:{photo:string;name:string;close:()=>void}){
 const [zoom,setZoom]=useState(100),panel=useRef<HTMLElement>(null),title=useId();
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useOverlay(panel,close);
 return createPortal(<div className="photo-overlay" onClick={event=>{if(event.target===event.currentTarget)close();}}><section className="photo-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby={title}>
  <div className="panel-heading"><h2 id={title}>Foto de {name}</h2><button type="button" className="icon-button" onClick={close} aria-label="Cerrar foto ampliada"><X size={20}/></button></div>
  <div className="photo-viewport" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};}} onPointerMove={e=>{if(drag.current){e.currentTarget.scrollLeft=drag.current.left+drag.current.x-e.clientX;e.currentTarget.scrollTop=drag.current.top+drag.current.y-e.clientY;}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><div className="photo-canvas" style={{width:`${zoom}%`,height:`${zoom}%`}}><img src={photo} alt={`Foto ampliada de ${name}`} referrerPolicy="no-referrer"/></div></div>
  <div className="photo-zoom-controls"><button type="button" className="secondary" disabled={zoom<=100} onClick={()=>setZoom(Math.max(100,zoom-50))} aria-label="Reducir foto"><ZoomOut size={18}/></button><label>Zoom <output>{zoom}%</output><input type="range" min="100" max="300" step="50" value={zoom} onChange={event=>setZoom(Number(event.target.value))} aria-label="Nivel de zoom de la foto"/></label><button type="button" className="secondary" disabled={zoom>=300} onClick={()=>setZoom(Math.min(300,zoom+50))} aria-label="Ampliar foto"><ZoomIn size={18}/></button><button type="button" className="text-button" onClick={()=>setZoom(100)}>Ajustar</button></div>
  <p className="form-note">Arrastrá para ver detalles. Esta vista no modifica la foto: usá «Mover y recortar foto» al editar el perfil para guardar un encuadre.</p>
 </section></div>,document.body);
}
export function PhotoViewer({photo,name,size=48}:{photo:string;name:string;size?:number}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="photo-preview-button" style={{width:size,height:size}} aria-label={`Ampliar foto de ${name}`} onClick={()=>setOpen(true)}><img src={photo} alt={`Foto de ${name}`} referrerPolicy="no-referrer"/><span aria-hidden="true"><ZoomIn size={13}/></span></button>{open&&<EnlargedPhoto photo={photo} name={name} close={()=>setOpen(false)}/>}</>;
}
