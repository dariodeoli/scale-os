"use client";
import {useState} from 'react';
import {api,Dialog,Editor} from './operations';
import {completeSave} from './save-completion';
import {TeamMember,teamRoleLabels} from './team-directory';
import './team-access.css';

type AccessState={label:string;className:string};
const accessState=(member:TeamMember|null):AccessState=>{
 if(!member)return {label:'Sin acceso al panel',className:'is-none'};
 if(member.removed_at)return {label:'Acceso retirado',className:'is-removed'};
 if(!member.active)return {label:'Acceso suspendido',className:'is-suspended'};
 return {label:'Acceso habilitado',className:'is-active'};
};

export function TeamAccess({member,email,role,refresh,ambiguous=false}:{member:TeamMember|null;email:string|null;role:string;refresh:()=>Promise<void>;ambiguous?:boolean}){
 const [invite,setInvite]=useState(false);
 const manage=['owner','admin','management'].includes(role)&&(!ambiguous||Boolean(member));
 const state=accessState(member);
 const canInvite=manage&&Boolean(email)&&(!member||Boolean(member.removed_at));
 return <section className="team-access" aria-label="Acceso al panel">
  <header className="team-access-header"><h3>Acceso al panel</h3><span className={`team-access-status ${state.className}`} data-access-state={state.className.slice(3)}>{state.label}</span></header>
  <div className="team-access-actions">
   {canInvite?<button type="button" className="secondary" onClick={()=>setInvite(true)}>{member?.removed_at?'Reinvitar':'Invitar al panel'}</button>:null}
  </div>
  {invite&&<Dialog title={member?.removed_at?'Reinvitar al panel':'Invitar al panel'} close={()=>setInvite(false)}><div className="team-access-dialog"><Editor fields={[{key:'email',label:'Correo del integrante',type:'email'},{key:'role',label:'Permiso de acceso',choices:Object.entries(teamRoleLabels).filter(([value])=>value!=='owner'||role==='owner').map(([value,label])=>({value,label}))}]} defaults={{email:email||'',role:'viewer'}} label="Enviar invitación" save={async values=>{await api('/api/agency/members',values);await completeSave(()=>setInvite(false),refresh);}}/></div></Dialog>}
 </section>;
}
