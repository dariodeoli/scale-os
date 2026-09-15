"use client";
import {useEffect,useRef,useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import dynamic from 'next/dynamic';
import {centeredPhotoArea} from './photo-fit';
import {validateImageLink} from './image-link';
import './photo-cropper.css';
import {Crop,Link2,Trash2} from 'lucide-react';
const PhotoCropper=dynamic(()=>import('./photo-cropper').then(m=>m.PhotoCropper));

const schema=z.object({photo:z.string().max(700000).refine(value=>{if(!value||value.startsWith('data:image/'))return true;try{const u=new URL(value);return value.length<=2048&&u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Usá un enlace HTTPS directo a una imagen, sin credenciales.')});

export async function preparePhoto(file:File,forLogo=false,centerCrop=false):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024)throw new Error('Elegí una foto JPG, PNG o WebP de hasta 4 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>40000000)throw new Error('Elegí una foto de menor resolución.');
    // Keep the original pixels locally until the user chooses the crop.
    // Only the final small crop is sent to the server.
    if(!forLogo&&!centerCrop)return await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('No se pudo leer la foto.'));
      reader.onerror=()=>reject(new Error('No se pudo leer la foto.'));
      reader.readAsDataURL(file);
    });
    const canvas=document.createElement('canvas');
    const area=centerCrop?centeredPhotoArea(bitmap.width,bitmap.height):{x:0,y:0,width:bitmap.width,height:bitmap.height};
    const ratio=Math.min(1,512/Math.max(area.width,area.height));
    canvas.width=Math.max(1,Math.round(area.width*ratio));canvas.height=Math.max(1,Math.round(area.height*ratio));
    const context=canvas.getContext('2d');if(!context)throw new Error('No se pudo preparar la foto.');
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.drawImage(bitmap,area.x,area.y,area.width,area.height,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/webp',0.92);
    if(result.length>700000)throw new Error('Elegí una foto más pequeña.');
    return result;
  }finally{bitmap.close();}
}

export function ProfilePhoto({photo,name,save,label='Foto de perfil',compact=false}:{photo:string|null;name:string;save:(value:string)=>Promise<void>;label?:string;compact?:boolean}){
  const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{photo:photo||''}});
  const [processing,setProcessing]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [cropSource,setCropSource]=useState<string|null>(null);
  const [originalSource,setOriginalSource]=useState<string|null>(null);
  const [useLink,setUseLink]=useState(false);
  const [failedPhoto,setFailedPhoto]=useState('');
  const isLogo=label==='Logo o foto del cliente';
  const mounted=useRef(true),saving=useRef(false),fileInput=useRef<HTMLInputElement|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  // State disables controls after rendering; the ref also rejects events arriving
  // in the same frame, before that render, across upload/link/crop save paths.
  const startSave=()=>{if(!mounted.current||saving.current)return false;saving.current=true;setProcessing(true);return true;};
  const finishSave=()=>{saving.current=false;if(mounted.current)setProcessing(false);};
  const preview=form.watch('photo');
  const busy=processing||form.formState.isSubmitting;
  const openCrop=()=>{
    const source=originalSource||preview;
    if(source?.startsWith('data:image/'))setCropSource(source);
    else setError('Elegí el archivo original para ajustar esta foto.');
  };
  return <section className={`ops-profile-section profile-photo-section${compact?' is-compact':''}${isLogo?' is-logo':''}`} aria-label={label}>
    {!compact&&<div className="profile-photo-section-heading"><strong>{label}</strong><small>Seleccioná la foto para reemplazarla; después podés ajustar el encuadre.</small></div>}
    <form className="form-stack profile-photo-form" noValidate onSubmit={form.handleSubmit(async values=>{
      if(!startSave())return;
      setError('');setNotice('');try{if(values.photo.startsWith('https:'))await validateImageLink(values.photo);if(!mounted.current)return;await save(values.photo);if(!mounted.current)return;form.reset(values);setFailedPhoto('');setNotice('Foto guardada.');}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo guardar la foto.');}finally{finishSave();}
    })}>
      <div className="profile-photo-summary">
      {preview&&preview!==failedPhoto?<button type="button" className="editable-photo" aria-label={`Cambiar foto de ${name}`} disabled={busy} onClick={()=>fileInput.current?.click()}><img src={preview} referrerPolicy="no-referrer" alt={`Foto de ${name}`} onError={()=>setFailedPhoto(preview)}/></button>:<button type="button" className="avatar editable-photo" aria-label={`Elegir foto de ${name}`} disabled={busy} onClick={()=>fileInput.current?.click()}>{name[0]}</button>}
      <div className="profile-photo-controls">
      <label className="photo-upload">{processing?'Preparando…':compact?'Cambiar foto':preview?'Cambiar foto':'Elegir foto'}<input ref={fileInput} aria-label="Elegir foto (JPG, PNG o WebP; hasta 4 MB)" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{
        const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file||!startSave())return;
        setError('');setNotice('');try{const source=await preparePhoto(file,isLogo);if(!mounted.current)return;const ready=isLogo?source:await preparePhoto(file,false,true);if(!mounted.current)return;setOriginalSource(source);form.setValue('photo',ready,{shouldDirty:true,shouldValidate:true});await save(ready);if(!mounted.current)return;form.reset({photo:ready});setFailedPhoto('');setNotice(isLogo?'Logo guardado automáticamente.':'Foto centrada y guardada automáticamente. Podés ajustar el encuadre.');}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo guardar la foto.');}finally{finishSave();}
      }}/></label>
      {!compact&&<><button type="button" className="text-button" disabled={busy} onClick={()=>setUseLink(v=>!v)}><Link2 size={14}/>{useLink?'Ocultar enlace':'Usar enlace de imagen'}</button>{preview.startsWith('data:image/')&&<button type="button" className="text-button" disabled={busy} onClick={openCrop}><Crop size={14}/>Mover y recortar</button>}</>}
      </div></div>
      {compact&&<details className="profile-photo-progressive"><summary>Más opciones de foto</summary><div><button type="button" className="text-button" disabled={busy} onClick={()=>setUseLink(v=>!v)}><Link2 size={14}/>{useLink?'Ocultar enlace':'Usar enlace de imagen'}</button>{preview.startsWith('data:image/')&&<button type="button" className="text-button" disabled={busy} onClick={openCrop}><Crop size={14}/>Mover y recortar</button>}</div></details>}
      {useLink&&<label>Enlace directo a la imagen<input type="url" value={preview.startsWith('data:')?'':preview} placeholder="https://…/foto.jpg" disabled={busy} onChange={e=>{form.setValue('photo',e.target.value,{shouldDirty:true,shouldValidate:true});setOriginalSource(null);}}/><small>Usá un enlace público de confianza. La imagen se carga desde ese sitio; puede dejar de funcionar si cambia. Para mover o recortar, subí el archivo original.</small></label>}
      {form.formState.errors.photo&&<p role="alert" className="error">{form.formState.errors.photo.message}</p>}
      {preview&&preview===failedPhoto&&<p role="alert" className="error">Esta imagen no se puede mostrar acá. El enlace puede haber vencido o el sitio bloquea mostrarla fuera de su propia página. Subí el archivo o probá otro enlace público.</p>}
      {form.formState.isDirty&&<p className="form-note" role="status">Vista previa: todavía no guardaste el cambio.</p>}
      <p className="form-note">JPG, PNG o WebP · Hasta 4 MB. Al subir se guarda automáticamente. Usá el original para mejor nitidez.</p>
      {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <div className="inline-actions">{form.formState.isDirty&&<button className="primary" disabled={busy}>{busy?'Procesando…':'Guardar foto'}</button>}<button type="button" className="text-button danger" disabled={busy||!preview} onClick={()=>{form.setValue('photo','',{shouldDirty:true});setOriginalSource(null);setNotice('Guardá para quitar la foto del perfil.');}}><Trash2 size={14}/>Quitar foto</button></div>
    </form>
    {cropSource&&<PhotoCropper source={cropSource} name={name} close={()=>setCropSource(null)} save={async value=>{if(!startSave())throw Error('Hay otra foto guardándose. Esperá a que termine.');try{await save(value);if(!mounted.current)return;form.reset({photo:value});setFailedPhoto('');setNotice('Foto y encuadre guardados.');}finally{finishSave();}}}/>}
  </section>;
}
