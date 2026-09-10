"use client";
import {useEffect,useState} from 'react';
import {teamRoleLabels} from '../team-directory';
export default function InvitationPage(){
 const [info,setInfo]=useState<{organization_name:string;role:string;mode:string}|null>(null),[message,setMessage]=useState('Comprobando invitación…'),[token,setToken]=useState('');
 useEffect(()=>{const q=new URLSearchParams(window.location.search);if(q.get('pending')){setMessage('Solicitud enviada. Un administrador debe aprobar tu acceso desde Equipo. Luego podrás ingresar con Google.');return;}if(q.get('error')){setMessage(q.get('error')!);return;}const t=q.get('token')||'';setToken(t);void fetch('/core-api/api/invitations/preview?token='+encodeURIComponent(t),{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setInfo(data);}).catch(e=>setMessage(e.message));},[]);
 return <main style={{maxWidth:560,margin:'8vh auto',padding:24}}><img src="/brand/icon-192.png" width={56} height={56} alt="Scale OS"/><h1>Invitación al equipo</h1>{info?<><h2>{info.organization_name}</h2><p>Permiso: <strong>{teamRoleLabels[info.role]}</strong></p><p>{info.mode==='single'?'El enlace admite una persona y se consume al habilitar el acceso.':'Tu solicitud quedará pendiente hasta que la administración la apruebe.'}</p><a className="primary" href={'https://admin.scaleparaguay.com/api/auth/google/start?invite='+encodeURIComponent(token)}>Continuar con Google</a></>:<p role="status">{message}</p>}<p><a href="https://app.scaleparaguay.com/">Ir al inicio de sesión</a></p></main>;
}
