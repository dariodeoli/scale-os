"use client";
import {useState} from 'react';
import {ChipEstado} from 'owncoding-ui';
import {roleCan} from './capabilities';
import {api,Dialog,Editor} from './operations';
import {completeSave} from './save-completion';
import {TeamMember,teamRoleLabels} from './team-directory';
import './team-access.css';

// El estado de acceso se dibuja con el chip canónico de la librería (v0.39);
// `estado` sale del mapa compartido y `etiqueta`/`tono` del dominio de equipo.
type AccessState={estado:string;etiqueta:string;tono?:string;icono?:string};
const accessState=(member:TeamMember|null):AccessState=>{
 if(!member)return {estado:'pendiente',etiqueta:'Sin acceso al panel'};
 if(member.removed_at)return {estado:'anulado',etiqueta:'Acceso retirado'};
 if(!member.active)return {estado:'suspendido',etiqueta:'Acceso suspendido',tono:'bad',icono:'alert'};
 return {estado:'activo',etiqueta:'Acceso habilitado'};
};

export function TeamAccess({member,email,role,refresh,ambiguous=false}:{member:TeamMember|null;email:string|null;role:string;refresh:()=>Promise<void>;ambiguous?:boolean}){
 const [invite,setInvite]=useState(false);
 const manage=roleCan(role,'members.manage')&&(!ambiguous||Boolean(member));
 const state=accessState(member);
 const canInvite=manage&&Boolean(email)&&(!member||Boolean(member.removed_at));
 return <section className="team-access" aria-label="Acceso al panel">
  <ChipEstado {...state} className="team-access-status"/>
  {canInvite&&<div className="team-access-actions"><button type="button" className="secondary" onClick={()=>setInvite(true)}>{member?.removed_at?'Reinvitar':'Invitar al panel'}</button></div>}
  {invite&&<Dialog title={member?.removed_at?'Reinvitar al panel':'Invitar al panel'} close={()=>setInvite(false)}><div className="team-access-dialog"><Editor fields={[{key:'email',label:'Correo del integrante',type:'email'},{key:'role',label:'Permiso de acceso',choices:Object.entries(teamRoleLabels).filter(([value])=>value!=='owner'||role==='owner').map(([value,label])=>({value,label}))}]} defaults={{email:email||'',role:'viewer'}} label="Enviar invitación" save={async values=>{await api('/api/agency/members',values);await completeSave(()=>setInvite(false),refresh);}}/></div></Dialog>}
 </section>;
}
