"use client";
import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {Crop,Link2,Trash2} from 'lucide-react';
import {preparePhoto,PHOTO_ACCEPT,PHOTO_FORMATS} from './profile-photo';
import {validateImageLink} from './image-link';

const PhotoCropper=dynamic(()=>import('./photo-cropper').then(m=>m.PhotoCropper));

export function PersonPhotoField({photo,name,save}:{photo:string|null;name:string;save:(value:string)=>Promise<void>}){
 const [current,setCurrent]=useState<string|null>(photo);
 const [processing,setProcessing]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [linkMode,setLinkMode]=useState(false);
 const [link,setLink]=useState('');
 const [original,setOriginal]=useState<string|null>(null);
 const [cropSource,setCropSource]=useState<string|null>(null);
 const [failed,setFailed]=useState(false);
 const mounted=useRef(true),busy=useRef(false),fileInput=useRef<HTMLInputElement|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const run=async(task:()=>Promise<void>,success:string)=>{
  if(busy.current)return;busy.current=true;setProcessing(true);setError('');setNotice('');
  try{await task();if(!mounted.current)return;setNotice(success);}
  catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'No se pudo guardar la foto.');}
  finally{busy.current=false;if(mounted.current)setProcessing(false);}
 };
 const store=async(value:string)=>{setCurrent(value);setFailed(false);await save(value);};
 async function pick(file:File){
  const source=await preparePhoto(file,false);
  const ready=await preparePhoto(file,false,true);
  setOriginal(source);setCurrent(ready);setFailed(false);
  await save(ready);
 }
 const remove=()=>void run(async()=>{setCurrent(null);setOriginal(null);setFailed(false);await save('');},'Foto quitada. Si la cuenta usaba la foto de Google, ya no se restaura sola.');
 const saveLink=()=>void run(async()=>{await validateImageLink(link);await store(link.trim());setLinkMode(false);},'Foto guardada desde el enlace.');
 const openCrop=()=>{const source=original||(current?.startsWith('data:image/')?current:null);if(source)setCropSource(source);else setError('Elegí el archivo original para ajustar el encuadre.');};
 return <section className="ops-profile-section profile-photo-section is-compact person-photo-field" aria-label="Foto de perfil">
  <div className="profile-photo-summary">
   {current&&!failed?<button type="button" className="editable-photo" aria-label={`Cambiar foto de ${name}`} disabled={processing} onClick={()=>fileInput.current?.click()}><img src={current} referrerPolicy="no-referrer" alt={`Foto de ${name}`} onError={()=>setFailed(true)}/></button>:<button type="button" className="avatar editable-photo" aria-label={`Elegir foto de ${name}`} disabled={processing} onClick={()=>fileInput.current?.click()}>{Array.from(name.trim())[0]||'?'}</button>}
   <div className="profile-photo-controls">
    <label className="photo-upload">{processing?'Preparando…':'Elegir foto'}<input ref={fileInput} type="file" accept={PHOTO_ACCEPT} aria-label={`Elegir foto (${PHOTO_FORMATS}; hasta 4 MB)`} disabled={processing} onChange={async event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file)return;await run(async()=>{await pick(file);},'Foto centrada y guardada automáticamente. Podés ajustar el encuadre.');}}/></label>
    <button type="button" className="text-button" disabled={processing} onClick={()=>setLinkMode(value=>!value)}><Link2 size={14}/>{linkMode?'Ocultar enlace':'Usar enlace'}</button>
    {original||current?.startsWith('data:image/')?<button type="button" className="text-button" disabled={processing} onClick={openCrop}><Crop size={14}/>Recortar</button>:null}
    {current?<button type="button" className="text-button danger" disabled={processing} onClick={remove}><Trash2 size={14}/>Quitar foto</button>:null}
   </div>
  </div>
  {linkMode&&<div className="form-stack"><label>Enlace directo a la imagen<input type="url" value={link} placeholder="https://…/foto.jpg" disabled={processing} onChange={event=>setLink(event.target.value)}/></label><div className="inline-actions"><button type="button" className="primary" disabled={processing||!link.trim()} onClick={saveLink}>{processing?'Guardando…':'Guardar enlace'}</button></div></div>}
  {failed&&<p className="error" role="alert">Esta imagen no se puede mostrar acá. El enlace puede haber vencido o el sitio bloquea mostrarla fuera de su propia página. Subí el archivo o probá otro enlace público.</p>}
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <p className="form-note">{PHOTO_FORMATS} · Hasta 4 MB. Al subir se guarda automáticamente.</p>
  {cropSource&&<PhotoCropper source={cropSource} name={name} close={()=>setCropSource(null)} save={async value=>{await run(async()=>{setOriginal(value);await store(value);},'Foto y encuadre guardados.');}}/>}
 </section>;
}
