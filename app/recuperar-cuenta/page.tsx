'use client';

import {useEffect,useState} from 'react';
import {WorkspaceFooter} from '../workspace-footer';
import {PasswordField} from '../password-field';

export default function RecoverAccount(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{setEmail(new URLSearchParams(window.location.search).get('email')||'');},[]);
 async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const response=await fetch('/core-api/api/auth/account/closure/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),credentials:'include'}),data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo recuperar la cuenta.');setDone(true);setPassword('');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo recuperar la cuenta.');}finally{setBusy(false);}}
 return <main className="login-page"><section className="login-card"><img src="/brand/icon-192.png" width={56} height={56} alt="Scale OS"/><h1>Recuperar cuenta</h1>{done?<><p>El cierre fue cancelado. Ya podés iniciar sesión normalmente.</p><a className="primary" href="/">Ir a iniciar sesión</a></>:<><p>Si solicitaste el cierre hace menos de 30 días, confirmá tus credenciales para recuperarla.</p><form onSubmit={submit}><label>Correo<input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} required/></label><PasswordField label="Contraseña" name="password" value={password} onChange={setPassword} autoComplete="current-password" required/><button className="primary" disabled={busy}>{busy?'Recuperando…':'Recuperar cuenta'}</button></form>{error&&<p className="error" role="alert">{error}</p>}<p><a href="/">Volver al inicio de sesión</a></p></>}<WorkspaceFooter/></section></main>;
}
