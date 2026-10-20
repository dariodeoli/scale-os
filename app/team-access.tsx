"use client";
import {useState} from 'react';
import {ChipEstado} from 'owncoding-ui/core';
import {accessRoleChoices,type TeamPermissionPolicy} from './team-permission-policy';
import {api,Dialog,Editor} from './operations';
import {completeSave} from './save-completion';
import {TeamMember,teamRoleLabels} from './team-directory';
import './team-access.css';
import {Button as ScaleButton} from "./ui/button";


// El estado de acceso se dibuja con el chip canónico de la librería (v0.39);
// `estado` sale del mapa compartido y `etiqueta`/`tono` del dominio de equipo.
type AccessState={estado:string;etiqueta:string;tono?:string;icono?:string};
export const accessState=(member:TeamMember|null):AccessState=>{
 if(!member)return {estado:'pendiente',etiqueta:'Sin acceso al panel'};
 if(member.removed_at)return {estado:'anulado',etiqueta:'Acceso retirado'};
 if(!member.active)return {estado:'suspendido',etiqueta:'Acceso suspendido',tono:'bad',icono:'alert'};
 return {estado:'activo',etiqueta:'Acceso habilitado'};
};

export function TeamAccess({member,email,role,capabilities,policy,refresh,ambiguous=false}:{member:TeamMember|null;email:string|null;role:string;capabilities?:Record<string,boolean>;policy?:TeamPermissionPolicy;refresh:()=>Promise<void>;ambiguous?:boolean}){
 const [invite,setInvite]=useState(false);
 const manage=policy?.canManageMembers===true&&(!ambiguous||Boolean(member))&&(!member||member.access_editable===true);
 const state=accessState(member);
 const choices=accessRoleChoices(policy).map(value=>({value,label:teamRoleLabels[value]||value}));
 const canInvite=manage&&choices.length>0&&Boolean(email)&&(!member||Boolean(member.removed_at));
 return <section className="team-access" aria-label="Acceso al panel">
  <ChipEstado {...state} className="team-access-status"/>
  {canInvite&&<div className="team-access-actions"><ScaleButton type="button" className="secondary" onClick={()=>setInvite(true)} variant="secondary">{member?.removed_at?'Reinvitar':'Invitar al panel'}</ScaleButton></div>}
  {invite&&canInvite&&<Dialog title={member?.removed_at?'Reinvitar al panel':'Invitar al panel'} close={()=>setInvite(false)}><div className="team-access-dialog"><Editor fields={[{key:'email',label:'Correo del integrante',type:'email'},{key:'role',label:'Permiso de acceso',choices}]} defaults={{email:email||'',role:choices.some(choice=>choice.value==='viewer')?'viewer':choices[0]?.value||''}} label="Enviar invitación" save={async values=>{if(!canInvite)return;await api('/api/agency/members',values);await completeSave(()=>setInvite(false),refresh);}}/></div></Dialog>}
 </section>;
}
