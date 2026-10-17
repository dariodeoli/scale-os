'use client';
import {useSingleFlightSubmit} from '../use-single-flight-submit';
import {PendingFields} from '../ui/form-state';

import {useEffect,useRef,useState} from 'react';
import {AccessLayout} from '../access-layout';
import {PasswordField} from '../password-field';
import {EmailField} from '../email-field';

export default function RecoverAccount(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false);
 const submission=useSingleFlightSubmit(submit),busy=submission.pending,errorFocus=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(error&&!busy)errorFocus.current?.focus();},[error,busy]);
 useEffect(()=>{setEmail(new URLSearchParams(window.location.search).get('email')||'');},[]);
 async function submit(){setError('');try{const response=await fetch('/core-api/api/auth/account/closure/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),credentials:'include'}),data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo recuperar la cuenta.');setDone(true);setPassword('');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo recuperar la cuenta.');}}
 return <AccessLayout eyebrow="Cuenta">
  <div className="grid gap-3">
   <h1 className="text-2xl font-bold tracking-tight text-fore">Recuperar cuenta</h1>
   {done?<>
    <p className="text-sm text-fore">El cierre fue cancelado. Ya podés iniciar sesión normalmente.</p>
    <a className="primary" href="/">Ir a iniciar sesión</a>
   </>:<>
    <p className="text-sm text-mute">Si solicitaste el cierre hace menos de 30 días, confirmá tus credenciales para recuperarla.</p>
    <PendingFields pending={busy}><form className="grid gap-3" onSubmit={submission.onSubmit}>
     <label className="grid gap-1.5 text-xs text-mute">Correo<EmailField value={email} onChange={setEmail} required/></label>
     <PasswordField label="Contraseña" name="password" value={password} onChange={setPassword} autoComplete="current-password" required/>
     <button className="primary" disabled={busy}>{busy?'Recuperando…':'Recuperar cuenta'}</button>
    </form></PendingFields>
    {error?<p ref={errorFocus} tabIndex={-1} className="error" role="alert">{error}</p>:null}
    <p className="text-[11.5px] text-mute"><a className="inline-flex min-h-11 items-center" aria-disabled={busy||undefined} tabIndex={busy?-1:undefined} onClick={event=>{if(busy)event.preventDefault();}} href="/">Volver al inicio de sesión</a></p>
   </>}
  </div>
 </AccessLayout>;
}
