"use client";
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import dynamic from 'next/dynamic';
import './photo-cropper.css';
const PhotoCropper=dynamic(()=>import('./photo-cropper').then(m=>m.PhotoCropper));

const schema=z.object({photo:z.string().max(700000)});

export async function preparePhoto(file:File,forLogo=false):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024)throw new Error('Elegí una foto JPG, PNG o WebP de hasta 4 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>40000000)throw new Error('Elegí una foto de menor resolución.');
    // Keep the original pixels locally until the user chooses the crop.
    // Only the final small crop is sent to the server.
    if(!forLogo)return await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('No se pudo leer la foto.'));
      reader.onerror=()=>reject(new Error('No se pudo leer la foto.'));
      reader.readAsDataURL(file);
    });
    const canvas=document.createElement('canvas');
    const ratio=Math.min(1,512/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
    const context=canvas.getContext('2d');if(!context)throw new Error('No se pudo preparar la foto.');
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/webp',0.85);
    if(result.length>700000)throw new Error('Elegí una foto más pequeña.');
    return result;
  }finally{bitmap.close();}
}

export function ProfilePhoto({photo,name,save,label='Foto de perfil'}:{photo:string|null;name:string;save:(value:string)=>Promise<void>;label?:string}){
  const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{photo:photo||''}});
  const [processing,setProcessing]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const [cropSource,setCropSource]=useState<string|null>(null);
  const [originalSource,setOriginalSource]=useState<string|null>(null);
  const preview=form.watch('photo');
  const busy=processing||form.formState.isSubmitting;
  const openCrop=()=>{
    const source=originalSource||preview;
    if(source?.startsWith('data:image/'))setCropSource(source);
    else setError('Elegí el archivo original para ajustar esta foto.');
  };
  return <details className="ops-profile-section"><summary>{label}</summary>
    <form className="form-stack profile-photo-form" noValidate onSubmit={form.handleSubmit(async values=>{
      setError('');setNotice('');try{await save(values.photo);form.reset(values);setNotice('Foto guardada.');}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la foto.');}
    })}>
      <div className="profile-photo-summary">
      {preview?<button type="button" className="editable-photo" aria-label={`Ajustar encuadre de ${name}`} disabled={busy} onClick={openCrop}><img src={preview} alt={`Foto de ${name}`}/></button>:<span className="avatar" aria-label="Sin foto">{name[0]}</span>}
      <div className="profile-photo-controls">
      <label className="photo-upload">{processing?'Preparando…':preview?'Cambiar foto':'Elegir foto'}<input aria-label="Elegir foto (JPG, PNG o WebP; hasta 4 MB)" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{
        const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file)return;
        setProcessing(true);setError('');setNotice('');try{const isLogo=label==='Logo o foto del cliente';const source=await preparePhoto(file,isLogo);setOriginalSource(source);if(isLogo)form.setValue('photo',source,{shouldDirty:true,shouldValidate:true});else setCropSource(source);}catch(e){setError(e instanceof Error?e.message:'No se pudo leer la foto.');}finally{setProcessing(false);}
      }}/></label>
      {preview&&<button type="button" className="text-button" disabled={busy} onClick={openCrop}>Mover y recortar</button>}
      </div></div>
      {form.formState.isDirty&&<p className="form-note" role="status">Vista previa: todavía no guardaste el cambio.</p>}
      <p className="form-note">JPG, PNG o WebP · Hasta 4 MB. Para un mejor zoom, elegí el archivo original.</p>
      {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <div className="inline-actions">{form.formState.isDirty&&<button className="primary" disabled={busy}>{busy?'Procesando…':'Guardar foto'}</button>}<button type="button" className="text-button" disabled={busy||!preview} onClick={()=>{form.setValue('photo','',{shouldDirty:true});setOriginalSource(null);setNotice('Guardá para quitar la foto del perfil.');}}>Quitar foto</button></div>
    </form>
    {cropSource&&<PhotoCropper source={cropSource} name={name} close={()=>setCropSource(null)} save={async value=>{await save(value);form.reset({photo:value});setNotice('Foto y encuadre guardados.');}}/>}
  </details>;
}
