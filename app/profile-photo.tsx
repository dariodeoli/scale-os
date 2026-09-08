"use client";
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';

const schema=z.object({photo:z.string().max(700000)});

async function preparePhoto(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024)throw new Error('Elegí una foto JPG, PNG o WebP de hasta 4 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>40000000)throw new Error('Elegí una foto de menor resolución.');
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

export function ProfilePhoto({photo,name,save}:{photo:string|null;name:string;save:(value:string)=>Promise<void>}){
  const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{photo:photo||''}});
  const [processing,setProcessing]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const preview=form.watch('photo');
  const busy=processing||form.formState.isSubmitting;
  return <details className="ops-profile-section"><summary>Foto de perfil</summary>
    <form className="form-stack" noValidate onSubmit={form.handleSubmit(async values=>{
      setError('');setNotice('');try{await save(values.photo);form.reset(values);setNotice('Foto guardada.');}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la foto.');}
    })}>
      {preview?<img src={preview} alt={`Foto de ${name}`} width={72} height={72} style={{borderRadius:'50%',objectFit:'cover'}} referrerPolicy="no-referrer"/>:<span className="avatar" aria-label="Sin foto">{name[0]}</span>}
      <p className="form-note">Solo alojamos fotos de perfil. La imagen se comprime antes de enviarla; el servidor guarda una miniatura sin metadatos. Los documentos y videos permanecen en Drive.</p>
      <label>Elegir foto (JPG, PNG o WebP; hasta 4 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{
        const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file)return;
        setProcessing(true);setError('');setNotice('');try{form.setValue('photo',await preparePhoto(file),{shouldDirty:true,shouldValidate:true});}catch(e){setError(e instanceof Error?e.message:'No se pudo leer la foto.');}finally{setProcessing(false);}
      }}/></label>
      {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <div className="inline-actions"><button className="primary" disabled={busy||!form.formState.isDirty}>{busy?'Procesando…':'Guardar foto'}</button><button type="button" className="text-button" disabled={busy||!preview} onClick={()=>{form.setValue('photo','',{shouldDirty:true});setNotice('Guardá para quitar la foto del perfil.');}}>Quitar foto</button></div>
    </form>
  </details>;
}
