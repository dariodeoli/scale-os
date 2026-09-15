"use client";
import {useEffect,useState} from 'react';
import {api,Dialog,Editor} from './operations';
import {KeyRound} from 'lucide-react';
export function PasswordPanel(){
 const [open,setOpen]=useState(false),[token,setToken]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),t=params.get('resetToken');
  if(t){setToken(t);setOpen(true);params.delete('resetToken');window.history.replaceState({},'',window.location.pathname+(params.size?'?'+params:''));}
 },[]);
 return <>
  <button type="button" className="text-button" onClick={()=>{setNotice('');setOpen(true);}}><KeyRound size={14}/>Establecer o recuperar contraseña</button>
  {!open&&notice&&<p role="status">{notice}</p>}
  {open&&<Dialog title={token?'Nueva contraseña':'Recuperar acceso'} close={()=>setOpen(false)}>
   {notice?<p role="status">{notice}</p>:<Editor fields={token?[
    {key:'password',label:'Nueva contraseña (mínimo 12 caracteres)',type:'password'},
    {key:'confirm',label:'Repetir contraseña',type:'password'},
   ]:[{key:'email',label:'Correo con acceso a la empresa',type:'email'}]}
    defaults={{email:'',password:'',confirm:''}} label={token?'Guardar contraseña':'Enviar enlace'} save={async v=>{
     if(token){
      if(v.password!==v.confirm)throw new Error('Las contraseñas no coinciden');
      await api('/api/auth/password/reset',{token,password:v.password});
      setToken('');setNotice('Contraseña actualizada. Ya podés iniciar sesión.');setOpen(false);
     }else{
      const d=await api<{message:string}>('/api/auth/password/request',{email:v.email});
      setNotice(d.message);
     }
    }}/>}</Dialog>}
 </>;
}
