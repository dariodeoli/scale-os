"use client";
import {useState} from 'react';
import Cropper,{type Area} from 'react-easy-crop';
import {Dialog,FormActions} from './dialog';
import 'react-easy-crop/react-easy-crop.css';
import './photo-cropper.css';

export async function cropImage(source:string,area:Area):Promise<string>{
 if(!source.startsWith('data:image/'))throw Error('Volvé a elegir el archivo original para ajustar el encuadre.');
 const response=await fetch(source),bitmap=await createImageBitmap(await response.blob());
 try{
  if(![area.x,area.y,area.width,area.height].every(Number.isFinite)||area.width<=0||area.height<=0)throw Error('Elegí un encuadre válido.');
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la imagen.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,area.x,area.y,area.width,area.height,0,0,512,512);
  return canvas.toDataURL('image/webp',0.92);
 }finally{bitmap.close();}
}
export function PhotoCropper({source,name,close,save}:{source:string;name:string;close:()=>void;save:(photo:string)=>Promise<void>}){
 const [crop,setCrop]=useState({x:0,y:0}),[zoom,setZoom]=useState(1),[area,setArea]=useState<Area|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <Dialog title={`Ajustar foto de ${name}`} close={()=>{if(!busy)close();}}>
  <p className="form-note">Mové la foto con el mouse, el dedo o las flechas. El círculo muestra cómo se verá tu perfil.</p>
  <div className="profile-crop-stage"><Cropper image={source} crop={crop} zoom={zoom} aspect={1} objectFit="cover" restrictPosition cropShape="round" showGrid={false} minZoom={1} maxZoom={3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_,pixels)=>setArea(pixels)} disableAutomaticStylesInjection zoomWithScroll={false} cropperProps={{'aria-label':'Mover encuadre de la foto'}} mediaProps={{onError:()=>setError('No se pudo abrir la foto. Volvé a elegir el archivo.')}}/></div>
  {area&&Math.min(area.width,area.height)<256&&<p className="form-note" role="status">Este encuadre tiene pocos píxeles. Reducí el zoom o elegí la foto original para mayor nitidez.</p>}
  <label className="crop-zoom">Zoom <output>{Math.round(zoom*100)}%</output><input aria-label="Zoom del encuadre" type="range" min="1" max="3" step="0.01" value={zoom} onChange={e=>setZoom(Number(e.target.value))} disabled={busy}/></label>
  <div className="quick-actions"><button type="button" className="text-button" disabled={busy} onClick={()=>{setCrop({x:0,y:0});setZoom(1);}}>Centrar de nuevo</button></div>
  {error&&<p className="error" role="alert">{error}</p>}
  <FormActions><button type="button" className="secondary" disabled={busy} onClick={close}>Cancelar</button><button type="button" className="primary" disabled={busy||!area} onClick={async()=>{if(!area)return;setBusy(true);setError('');try{await save(await cropImage(source,area));close();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}}}>{busy?'Guardando…':'Guardar foto y encuadre'}</button></FormActions>
 </Dialog>;
}
