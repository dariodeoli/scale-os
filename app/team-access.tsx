"use client";
import {useState} from 'react';
import {api,Dialog,Editor} from './operations';
import {MemberActions} from './suite';
import {completeSave} from './save-completion';
import {TeamMember,teamRoleLabels} from './team-directory';
export function TeamAccess({member,email,role,currentEmail,refresh,ambiguous=false}:{member:TeamMember|null;email:string|null;role:string;currentEmail:string;refresh:()=>Promise<void>;ambiguous?:boolean}){
 const [invite,setInvite]=useState(false);
 const manage=['owner','admin'].includes(role)&&(!ambiguous||Boolean(member));
 const state=member?member.removed_at?'Acceso retirado':member.active?'Acceso habilitado':'Acceso suspendido':'Sin acceso al panel';
 return <div className="team-access"><p><strong>{state}</strong>{member&&<> · {teamRoleLabels[member.role]||member.role}</>}</p>
 {manage&&member&&!member.removed_at?<MemberActions member={member} currentEmail={currentEmail} role={role} refresh={refresh}/>:manage&&email?<button type="button" className="text-button" onClick={()=>setInvite(true)}>{member?.removed_at?'Volver a invitar':'Invitar al panel'}</button>:null}
 {invite&&<Dialog title="Invitar a esta empresa" close={()=>setInvite(false)}><p>Se habilitará el acceso y se enviará una invitación al correo indicado. Los datos del perfil y los pagos se conservan.</p><Editor fields={[{key:'email',label:'Correo del integrante',type:'email'},{key:'role',label:'Permiso de acceso',choices:Object.entries(teamRoleLabels).filter(([value])=>value!=='owner'||role==='owner').map(([value,label])=>({value,label}))}]} defaults={{email:email||'',role:'viewer'}} label="Habilitar y enviar invitación" save={async values=>{await api('/api/agency/members',values);await completeSave(()=>setInvite(false),refresh);}}/></Dialog>}
 </div>;
}
